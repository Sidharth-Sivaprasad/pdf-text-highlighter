"""
PDF Text Search Backend with OCR
Place this file in: server/app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
import os

app = Flask(__name__)

# Enable CORS for React frontend
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})


try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  

MAX_WORKERS = int(os.getenv('MAX_WORKERS', '4'))
OCR_DPI = int(os.getenv('OCR_DPI', '300'))
MIN_CONFIDENCE = int(os.getenv('MIN_CONFIDENCE', '30'))

def process_page(page_data):
    """
    Process a single PDF page with OCR
    Returns list of matches found on this page
    """
    page_num, pdf_bytes, search_text = page_data
    
    try:
        # Open PDF from bytes
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf[page_num]
        
        # Extract page as image with specified DPI
        pix = page.get_pixmap(dpi=OCR_DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # Perform OCR with word-level bounding boxes
        ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        
        # Search for text matches in this page
        matches = find_text_in_page(ocr_data, search_text, page_num)
        
        pdf.close()
        
        print(f"✓ Page {page_num + 1} - Found {len(matches)} match(es)")
        return matches
        
    except Exception as e:
        print(f"✗ Error processing page {page_num + 1}: {str(e)}")
        return []

def find_text_in_page(ocr_data, search_text, page_num):
    """
    Find all occurrences of search text in OCR data with coordinates
    Handles both exact phrases and fuzzy word matching
    """
    matches = []
    search_lower = search_text.lower().strip()
    
    # Build list of words with their bounding boxes
    words = []
    for i in range(len(ocr_data['text'])):
        # Filter out low confidence OCR results
        if int(ocr_data['conf'][i]) > MIN_CONFIDENCE:
            word = ocr_data['text'][i].strip()
            if word:
                words.append({
                    'text': word,
                    'left': ocr_data['left'][i],
                    'top': ocr_data['top'][i],
                    'width': ocr_data['width'][i],
                    'height': ocr_data['height'][i],
                    'index': i
                })
    
    # Split search text into words
    search_words = search_lower.split()
    
    # Sliding window to find matching phrases
    for i in range(len(words)):
        match_length = 0
        match_text = []
        
        # Try to match consecutive words
        for j, search_word in enumerate(search_words):
            if i + j < len(words):
                word_lower = words[i + j]['text'].lower()
                
                # Flexible matching: substring or exact
                if search_word in word_lower or word_lower in search_word:
                    match_length += 1
                    match_text.append(words[i + j]['text'])
                else:
                    break
        
        # If all search words matched consecutively
        if match_length == len(search_words):
            first_word = words[i]
            last_word = words[i + match_length - 1]
            
            # Calculate bounding box for entire matched phrase
            left = first_word['left']
            top = min(first_word['top'], last_word['top'])
            right = last_word['left'] + last_word['width']
            bottom = max(
                first_word['top'] + first_word['height'],
                last_word['top'] + last_word['height']
            )
            
            # Extract context (surrounding words)
            context_start = max(0, i - 5)
            context_end = min(len(words), i + match_length + 5)
            context = ' '.join([words[k]['text'] for k in range(context_start, context_end)])
            
            matches.append({
                'page': page_num + 1,  # 1-indexed for display
                'left': int(left),
                'top': int(top),
                'width': int(right - left),
                'height': int(bottom - top),
                'matched_text': ' '.join(match_text),
                'context': context,
                'confidence': 'high'  # Could calculate average confidence
            })
    
    return matches

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Backend is running',
        'tesseract_available': check_tesseract()
    })

def check_tesseract():
    """Check if Tesseract is properly installed"""
    try:
        version = pytesseract.get_tesseract_version()
        return True
    except:
        return False

@app.route('/search', methods=['POST', 'OPTIONS'])
def search_pdf():
    """
    Main endpoint to search PDF for text excerpts
    
    Expects:
    - pdf: PDF file (multipart/form-data)
    - search_text: Text excerpt to search for
    
    Returns:
    - JSON with matches, coordinates, and metadata
    """
    # Handle preflight CORS request
    if request.method == 'OPTIONS':
        return '', 204
    
    start_time = time.time()
    
    # Validate request
    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF file provided'}), 400
    
    if 'search_text' not in request.form:
        return jsonify({'error': 'No search text provided'}), 400
    
    pdf_file = request.files['pdf']
    search_text = request.form['search_text'].strip()
    
    if not search_text:
        return jsonify({'error': 'Search text cannot be empty'}), 400
    
    if not pdf_file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'File must be a PDF'}), 400
    
    try:
        print(f"\n{'='*60}")
        print(f"Starting PDF search for: '{search_text}'")
        print(f"{'='*60}")
        
        # Read PDF into memory
        pdf_bytes = pdf_file.read()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(pdf)
        pdf.close()
        
        print(f"Total pages: {total_pages}")
        print(f"Processing with {MAX_WORKERS} parallel workers...")
        
        # Prepare data for parallel processing
        page_data = [(i, pdf_bytes, search_text) for i in range(total_pages)]
        
        all_matches = []
        
        # Process pages in parallel
        with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_page = {
                executor.submit(process_page, data): data[0] 
                for data in page_data
            }
            
            for future in as_completed(future_to_page):
                page_num = future_to_page[future]
                try:
                    matches = future.result()
                    all_matches.extend(matches)
                except Exception as e:
                    print(f"✗ Error on page {page_num + 1}: {str(e)}")
        
        processing_time = time.time() - start_time
        
        # Group matches by page
        pages_with_matches = {}
        for match in all_matches:
            page_num = match['page']
            if page_num not in pages_with_matches:
                pages_with_matches[page_num] = []
            
            pages_with_matches[page_num].append({
                'left': match['left'],
                'top': match['top'],
                'width': match['width'],
                'height': match['height'],
                'context': match['context'],
                'matched_text': match['matched_text']
            })
        
        # Format response
        results = {
            'success': True,
            'total_matches': len(all_matches),
            'total_pages': total_pages,
            'pages_with_matches': len(pages_with_matches),
            'processing_time': f"{processing_time:.2f}s",
            'search_query': search_text,
            'matches': [
                {
                    'page': page_num,
                    'occurrences': len(locations),
                    'locations': locations
                }
                for page_num, locations in sorted(pages_with_matches.items())
            ]
        }
        
        print(f"\n{'='*60}")
        print(f"✓ Search complete!")
        print(f"  Found: {len(all_matches)} match(es) in {len(pages_with_matches)} page(s)")
        print(f"  Time: {processing_time:.2f}s")
        print(f"{'='*60}\n")
        
        return jsonify(results)
        
    except Exception as e:
        error_msg = f"Failed to process PDF: {str(e)}"
        print(f"\n✗ ERROR: {error_msg}\n")
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500

# @app.route('/config', methods=['GET'])
# def get_config():
#     """Return current server configuration"""
#     return jsonify({
#         'max_workers': MAX_WORKERS,
#         'ocr_dpi': OCR_DPI,
#         'min_confidence': MIN_CONFIDENCE,
#         'tesseract_installed': check_tesseract()
#     })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("PDF Text Search Backend Server")
    print("="*60)
    
    # Check Tesseract installation
    if check_tesseract():
        print("✓ Tesseract OCR: INSTALLED")
        try:
            version = pytesseract.get_tesseract_version()
            print(f"  Version: {version}")
        except:
            pass
    else:
        print("✗ Tesseract OCR: NOT FOUND")
        print("\nPlease install Tesseract:")
        print("  Mac:     brew install tesseract")
        print("  Ubuntu:  sudo apt install tesseract-ocr")
        print("  Windows: https://github.com/UB-Mannheim/tesseract/wiki")
        print("\n")
        exit(1)
    
    print(f"\nConfiguration:")
    print(f"  Max Workers: {MAX_WORKERS}")
    print(f"  OCR DPI: {OCR_DPI}")
    print(f"  Min Confidence: {MIN_CONFIDENCE}%")
    print(f"\nServer starting on http://localhost:8000")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=8000)