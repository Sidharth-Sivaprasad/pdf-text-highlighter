"""
PDF Text Search Backend with EasyOCR and Chunked Upload
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import easyocr
from PIL import Image
import numpy as np
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
import os
import multiprocessing
import psutil

# ---------------- Configuration ---------------- #
UPLOAD_FOLDER = "tmp_uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_WORKERS = int(os.getenv("MAX_WORKERS", 10))
OCR_DPI = int(os.getenv("OCR_DPI", 300))
MIN_CONFIDENCE = int(os.getenv("MIN_CONFIDENCE", 30))  # Percent

# Initialize EasyOCR reader globally
reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if GPU available

# ---------------- Flask App ---------------- #
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000"]}},
    supports_credentials=True,
)

# ---------------- Utility Functions ---------------- #
def check_easyocr():
    try:
        _ = reader
        return True
    except:
        return False

def get_optimal_workers(total_pages: int):
    cpu_count = multiprocessing.cpu_count()
    total_ram_gb = psutil.virtual_memory().total / (1024 ** 3)
    max_by_ram = int(total_ram_gb // 0.5)
    upper_limit = min(cpu_count - 1, max_by_ram, 8)
    optimal = min(upper_limit, total_pages)
    return max(2, optimal)

# ---------------- OCR & Search ---------------- #
def process_page(page_data):
    page_num, pdf_bytes, search_text = page_data
    try:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf[page_num]

        # Rasterize page to image
        pix = page.get_pixmap(dpi=OCR_DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img_np = np.array(img)

        # OCR with EasyOCR
        ocr_results = reader.readtext(img_np)

        matches = find_text_in_page_easyocr(ocr_results, search_text, page_num)
        pdf.close()
        print(f"✓ Page {page_num + 1} - Found {len(matches)} match(es)")
        return matches
    except Exception as e:
        print(f"✗ Error processing page {page_num + 1}: {str(e)}")
        return []

def find_text_in_page_easyocr(ocr_results, search_text, page_num):
    matches = []
    search_lower = search_text.lower().strip()
    search_words = search_lower.split()

    # Convert EasyOCR output to word dicts
    words = []
    for bbox, text, conf in ocr_results:
        if conf * 100 >= MIN_CONFIDENCE:
            x_min = int(min([p[0] for p in bbox]))
            y_min = int(min([p[1] for p in bbox]))
            x_max = int(max([p[0] for p in bbox]))
            y_max = int(max([p[1] for p in bbox]))
            words.append({
                "text": text.strip(),
                "left": x_min,
                "top": y_min,
                "width": x_max - x_min,
                "height": y_max - y_min,
                "conf": conf,
            })

    # Search for consecutive word matches
    for i in range(len(words)):
        match_length = 0
        match_text = []
        for j, search_word in enumerate(search_words):
            if i + j < len(words):
                word_lower = words[i + j]["text"].lower()
                if search_word in word_lower or word_lower in search_word:
                    match_length += 1
                    match_text.append(words[i + j]["text"])
                else:
                    break

        if match_length == len(search_words):
            first_word = words[i]
            last_word = words[i + match_length - 1]

            left = first_word["left"]
            top = min(first_word["top"], last_word["top"])
            right = last_word["left"] + last_word["width"]
            bottom = max(first_word["top"] + first_word["height"], last_word["top"] + last_word["height"])

            context_start = max(0, i - 5)
            context_end = min(len(words), i + match_length + 5)
            context = " ".join([words[k]["text"] for k in range(context_start, context_end)])

            matches.append({
                "page": page_num + 1,
                "left": int(left),
                "top": int(top),
                "width": int(right - left),
                "height": int(bottom - top),
                "matched_text": " ".join(match_text),
                "context": context,
                "confidence": "high" if first_word["conf"] > 0.8 else "medium",
            })

    return matches

# ---------------- Routes ---------------- #
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "easyocr_available": check_easyocr()})

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
    pdf_bytes = open(pdf_path, "rb").read()
    pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(pdf)
    pdf.close()

    page_data = [(i, pdf_bytes, search_text) for i in range(total_pages)]
    all_matches = []

    max_workers = get_optimal_workers(total_pages)
    print(f"Using {max_workers} workers for {total_pages} pages")

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_page = {executor.submit(process_page, data): data[0] for data in page_data}
        for future in as_completed(future_to_page):
            page_num = future_to_page[future]
            try:
                matches = future.result()
                all_matches.extend(matches)
            except Exception as e:
                print(f"✗ Error on page {page_num + 1}: {str(e)}")

    pages_with_matches = {}
    for match in all_matches:
        page_num = match["page"]
        if page_num not in pages_with_matches:
            pages_with_matches[page_num] = []
        pages_with_matches[page_num].append({
            "left": match["left"],
            "top": match["top"],
            "width": match["width"],
            "height": match["height"],
            "context": match["context"],
            "matched_text": match["matched_text"],
        })

    processing_time = time.time() - start_time
    results = {
        "success": True,
        "total_matches": len(all_matches),
        "total_pages": total_pages,
        "pages_with_matches": len(pages_with_matches),
        "processing_time": f"{processing_time:.2f}s",
        "search_query": search_text,
        "matches": [
            {"page": page_num, "occurrences": len(locs), "locations": locs}
            for page_num, locs in sorted(pages_with_matches.items())
        ],
    }

    print(f"✓ Search complete: {len(all_matches)} matches in {len(pages_with_matches)} pages")
    return jsonify(results)

# ---------------- Main ---------------- #
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PDF Text Search Backend Server (EasyOCR)")
    print("=" * 60)

    if check_easyocr():
        print("✓ EasyOCR is available")
    else:
        print("✗ EasyOCR not found or failed to initialize")
        exit(1)

    print(f"OCR DPI: {OCR_DPI}")
    print(f"Min Confidence: {MIN_CONFIDENCE}%")
    print("Server starting on http://localhost:8000")
    print("=" * 60 + "\n")

    app.run(debug=True, host="0.0.0.0", port=8000)
