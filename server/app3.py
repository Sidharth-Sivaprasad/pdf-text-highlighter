"""
Image PDF Text Search Backend with OCR and Chunked Upload
WITH SESSION-BASED OCR CACHING
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
import os
import multiprocessing
import psutil
from rapidfuzz import fuzz
import hashlib

# Configs
UPLOAD_FOLDER = "tmp_uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_WORKERS = int(os.getenv("MAX_WORKERS", 8))
OCR_DPI = int(os.getenv("OCR_DPI", 300))
MIN_CONFIDENCE = int(os.getenv("MIN_CONFIDENCE", 15))

# Flask App
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000"]}},
    supports_credentials=True,
)


# Global dictionary to store OCR data per file
# Structure: {file_hash: {"pages": [ocr_data_per_page], "total_pages": int}}
OCR_CACHE = {}

def get_file_cache_key(file_path, file_name):
    """Generate cache key based on filename and size"""
    file_size = os.path.getsize(file_path)
    cache_key = f"{file_name}_{file_size}"
    
    print(f"DEBUG Cache Key Generation:")
    print(f"  - File Name: {file_name}")
    print(f"  - File Size: {file_size} bytes")
    print(f"  - Cache Key String: {cache_key}")
    
    hash_result = hashlib.md5(cache_key.encode()).hexdigest()
    print(f"  - Hash Result: {hash_result}")
    print(f"  - Current Cache Keys: {list(OCR_CACHE.keys())}")
    
    return hash_result

def get_ocr_from_cache(file_hash):
    """Retrieve OCR data from cache if available"""

    # print(f"Checking cache : {OCR_CACHE}")
    if file_hash in OCR_CACHE:
        print(f"✓ Cache HIT for file {file_hash[:8]}...")
        return OCR_CACHE[file_hash]
    print(f"✗ Cache MISS for file {file_hash[:8]}...")
    return None

def store_ocr_in_cache(file_hash, ocr_data, total_pages):
    """Store OCR data in cache"""
    OCR_CACHE[file_hash] = {
        "pages": ocr_data,
        "total_pages": total_pages
    }
    print(f"✓ Cached OCR data for file {file_hash[:8]}... ({total_pages} pages)")

def clear_cache():
    """Clear the OCR cache"""
    global OCR_CACHE
    count = len(OCR_CACHE)
    OCR_CACHE.clear()
    return count
# ================================

# Utility Functions
def check_tesseract():
    try:
        _ = pytesseract.get_tesseract_version()
        return True
    except:
        return False

def get_optimal_workers(total_pages: int):
    cpu_count = multiprocessing.cpu_count()
    total_ram_gb = psutil.virtual_memory().total / (1024 ** 3)
    max_by_ram = int(total_ram_gb // 0.5)
    print(f"System has {cpu_count} CPUs and {total_ram_gb:.2f}GB RAM and {max_by_ram}")
    upper_limit = min(cpu_count - 1, max_by_ram, 8)
    optimal = min(upper_limit, total_pages)
    print(f"Optimal workers based on system resources: {optimal}")
    return max(2, optimal)


def process_page_ocr(page_data):
    """
    Process a single PDF page with OCR
    Returns OCR data for this page
    """
    page_num, pdf_bytes = page_data
    try:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf[page_num]

        pix = page.get_pixmap(dpi=OCR_DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img = img.convert('L')
        tesseract_config = '--psm 3 --oem 3'

        ocr_data = pytesseract.image_to_data(
            img,
            lang='eng',
            config=tesseract_config,
            output_type=pytesseract.Output.DICT
        )
        pdf.close()

        print(f"✓ OCR Page {page_num + 1} completed")
        return (page_num, ocr_data)
    except Exception as e:
        print(f"✗ Error OCR processing page {page_num + 1}: {str(e)}")
        return (page_num, None)


def find_text_in_ocr_data(ocr_data, search_text, page_num):
    """
    Finds matches in pre-processed OCR data
    Returns matches found on this page
    """
    matches = []
    search_lower = search_text.lower().strip()
    words = []
    
    for i in range(len(ocr_data["text"])):
        if int(ocr_data["conf"][i]) > MIN_CONFIDENCE:
            word = ocr_data["text"][i].strip()
            if word:
                words.append(
                    {
                        "text": word,
                        "left": ocr_data["left"][i],
                        "top": ocr_data["top"][i],
                        "width": ocr_data["width"][i],
                        "height": ocr_data["height"][i],
                        "index": i,
                    }
                )

    search_words = search_lower.split()

    for i in range(len(words)):
        match_length = 0
        match_text = []
        match_scores = []

        for j, search_word in enumerate(search_words):
            if i + j < len(words):
                word_lower = words[i + j]["text"].lower()
                score = fuzz.ratio(word_lower, search_word)
                is_match = (score >= 80)
                
                if is_match:
                    match_length += 1
                    match_text.append(words[i + j]["text"])
                    match_scores.append(score)
                else:
                    break

        if match_length == len(search_words):
            matched_words = words[i : i + match_length]
            
            left = min(w["left"] for w in matched_words)
            top = min(w["top"] for w in matched_words)
            right = max(w["left"] + w["width"] for w in matched_words)
            bottom = max(w["top"] + w["height"] for w in matched_words)

            PADDING = 15
            left = max(0, left - PADDING)
            top = max(0, top - PADDING)
            right = right + PADDING
            bottom = bottom + PADDING

            context_start = max(0, i - 5)
            context_end = min(len(words), i + match_length + 5)
            context = " ".join([words[k]["text"] for k in range(context_start, context_end)])

            avg_score = sum(match_scores) / len(match_scores) if match_scores else 100
            confidence = "high" if avg_score >= 90 else "medium" if avg_score >= 80 else "low"

            matches.append(
                {
                    "page": page_num + 1,
                    "left": int(left),
                    "top": int(top),
                    "width": int(right - left),
                    "height": int(bottom - top),
                    "matched_text": " ".join(match_text),
                    "context": context,
                    "confidence": confidence,
                    "match_score": round(avg_score, 1),
                }
            )

    return matches


# Routes

@app.route("/health", methods=["GET"])
def health_check():
    cache_info = {
        "cached_files": len(OCR_CACHE),
        "total_cached_pages": sum(data["total_pages"] for data in OCR_CACHE.values())
    }
    return jsonify({
        "status": "ok",
        "tesseract_available": check_tesseract(),
        "cache": cache_info
    })


@app.route("/upload-chunk", methods=["POST"])
def upload_chunk():
    chunk = request.files.get("chunk")
    index = request.form.get("index")
    file_name = request.form.get("fileName")
    total = request.form.get("total")

    if not chunk or not index or not file_name or not total:
        return jsonify({"error": "Missing chunk, index, total, or fileName"}), 400

    index = int(index)
    total = int(total)
    temp_path = os.path.join(UPLOAD_FOLDER, file_name)

    mode = "ab" if os.path.exists(temp_path) else "wb"
    with open(temp_path, mode) as f:
        f.write(chunk.read())

    print(f"Uploaded chunk {index + 1}/{total} for {file_name}")
    return jsonify({"status": "ok"})


@app.route("/upload-complete", methods=["POST"])
def upload_complete():
    file_name = request.form.get("fileName")
    if not file_name:
        return jsonify({"error": "Missing fileName"}), 400

    final_path = os.path.join(UPLOAD_FOLDER, file_name)
    if not os.path.exists(final_path):
        return jsonify({"error": "File not found"}), 400

    print(f"Upload complete for {file_name}")
    return jsonify({"status": "ok", "fileName": file_name})


@app.route("/search", methods=["POST"])
def search_pdf():
    file_name = request.form.get("fileName")
    search_text = request.form.get("search_text")

    if not file_name or not search_text:
        return jsonify({"error": "Missing fileName or search_text"}), 400

    pdf_path = os.path.join(UPLOAD_FOLDER, file_name)
    if not os.path.exists(pdf_path):
        return jsonify({"error": "File not found"}), 400

    start_time = time.time()
    
    # Generate file hash for caching
    file_hash = get_file_cache_key(pdf_path, file_name)
    print(file_hash)

    
    # Check if OCR data is cached
    cached_data = get_ocr_from_cache(file_hash)
    
    if cached_data:
        # Use cached OCR data
        ocr_pages = cached_data["pages"]
        total_pages = cached_data["total_pages"]
        ocr_time = 0
        print(f"✓ Using cached OCR data ({total_pages} pages)")
    else:
        # Perform OCR (cache miss)
        print(f"⚡ Performing OCR (not cached)")
        ocr_start = time.time()
        
        pdf_bytes = open(pdf_path, "rb").read()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(pdf)
        pdf.close()

        page_data = [(i, pdf_bytes) for i in range(total_pages)]
        ocr_pages = [None] * total_pages

        MAX_WORKERS = get_optimal_workers(total_pages)
        print(f"Using {MAX_WORKERS} workers for {total_pages} pages")

        with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_page = {executor.submit(process_page_ocr, data): data[0] for data in page_data}
            for future in as_completed(future_to_page):
                page_num = future_to_page[future]
                try:
                    result_page_num, ocr_data = future.result()
                    ocr_pages[result_page_num] = ocr_data
                except Exception as e:
                    print(f"✗ Error on page {page_num + 1}: {str(e)}")

        # Store in cache
        store_ocr_in_cache(file_hash, ocr_pages, total_pages)
        ocr_time = time.time() - ocr_start
        print(f"✓ OCR completed in {ocr_time:.2f}s")

    # Now perform search on OCR data
    search_start = time.time()
    all_matches = []
    
    for page_num, ocr_data in enumerate(ocr_pages):
        if ocr_data:
            matches = find_text_in_ocr_data(ocr_data, search_text, page_num)
            all_matches.extend(matches)
            if matches:
                print(f"✓ Page {page_num + 1} - Found {len(matches)} match(es)")

    search_time = time.time() - search_start

    # Build response
    pages_with_matches = {}
    for match in all_matches:
        page_num = match["page"]
        if page_num not in pages_with_matches:
            pages_with_matches[page_num] = []
        pages_with_matches[page_num].append(
            {
                "left": match["left"],
                "top": match["top"],
                "width": match["width"],
                "height": match["height"],
                "context": match["context"],
                "matched_text": match["matched_text"],
            }
        )

    total_time = time.time() - start_time
    results = {
        "success": True,
        "total_matches": len(all_matches),
        "total_pages": total_pages,
        "pages_with_matches": len(pages_with_matches),
        "processing_time": f"{total_time:.2f}s",
        "ocr_time": f"{ocr_time:.2f}s" if ocr_time > 0 else "0.00s (cached)",
        "search_time": f"{search_time:.2f}s",
        "from_cache": cached_data is not None,
        "search_query": search_text,
        "matches": [
            {"page": page_num, "occurrences": len(locs), "locations": locs}
            for page_num, locs in sorted(pages_with_matches.items())
        ],
    }

    print(f"✓ Search complete: {len(all_matches)} matches in {len(pages_with_matches)} pages")
    print(f"  Total time: {total_time:.2f}s | Search time: {search_time:.2f}s")
    return jsonify(results)


@app.route("/clear-cache", methods=["POST"])
def clear_cache_endpoint():
    """Clear the OCR cache to free memory"""
    count = clear_cache()
    print(f"✓ Cleared cache ({count} files)")
    return jsonify({
        "success": True,
        "cleared_files": count,
        "message": f"Cache cleared ({count} files removed)"
    })


# Main
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PDF Text Search Backend Server (WITH OCR CACHING)")
    print("=" * 60)

    if check_tesseract():
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract OCR installed: {version}")
    else:
        print("✗ Tesseract OCR not found. Install it before running.")
        exit(1)

    print(f"OCR DPI: {OCR_DPI}")
    print(f"Min Confidence: {MIN_CONFIDENCE}%")
    print(f"Cache: IN-MEMORY (session-based)")
    print("Server starting on http://localhost:8000")
    print("=" * 60 + "\n")

    app.run(debug=True, host="0.0.0.0", port=8000)