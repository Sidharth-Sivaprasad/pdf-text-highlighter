# PDF Text Highlighter

An OCR application that enables intelligent text search and highlighting in scanned PDF documents. Built with Next.js, Flask, and Tesseract OCR, it features multi-line text detection, fuzzy matching, and real-time highlighting with navigation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Node.js](https://img.shields.io/badge/node-18+-green.svg)

## ✨ Features

- **OCR-Powered Search**: Extract and search text from scanned PDFs using Tesseract OCR
- **Smart Highlighting**: Multi-line text detection with precise per-line highlighting
- **Fuzzy Matching**: Find text with 80%+ similarity using RapidFuzz
- **Modern UI**: Dark-themed, responsive interface built with Tailwind CSS

## 🏗️ Architecture

```
pdf-text-highlighter/
├── client/pdf-highlighter/  # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── context/          # React context providers
│   └── public/           # Static assets
│
└── server/                # Flask backend
    ├── app.py            # Main Flask application
    ├── requirements.txt  # Python dependencies
    └── tmp_uploads/      # Temporary file storage (auto-created)
```

```
┌─────────────────┐         HTTP/REST API          ┌─────────────────┐
│                 │ ◄────────────────────────────► │                 │
│  Client (Web)   │                                │  Server (API)   │
│   Next.js       │   Request: Upload PDF,         │     Flask       │
│   React         │            Search Text         │     Python      │
│                 │                                │                 │
│  - UI/UX        │   Response: Search Results     │  - OCR          │
│  - PDF Viewer   │            + Coordinates       │  - Processing   │
│  - State Mgmt   │                                │                 │
└─────────────────┘                                └─────────────────┘
       │                                                    │
       │                                                    │
       ▼                                                    ▼
  Browser Storage                                   Temp File System
  (Temp Files)
```

Client-server architecture is ideal here because OCR processing is computationally intensive and requires specialized libraries (Tesseract, PyMuPDF) that don't run efficiently in browsers. By offloading OCR to a Python server, the app leverages multi-core parallel processing (ProcessPoolExecutor with 8 workers) to process pages faster, while keeping the browser responsive. The server can also enables session-based caching where OCR results persist across searches, making subsequent queries on the same PDF nearly instant (<0.5s). Additionally, the separation allows the Next.js frontend to focus on providing a smooth, interactive UI with real-time progress updates and PDF highlighting, while the Flask backend handles heavy lifting with optimized native libraries. This architecture ensures consistent performance across all devices, better resource management, and the ability to scale processing power independently from the user interface.

## 📋 Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 18.0 or higher
- **RAM**: Minimum 4GB (8GB+ recommended for large PDFs)
- **Tesseract OCR**: 4.0 or higher

### Required Software

#### 1. Tesseract OCR Installation

**macOS:**

```bash
brew install tesseract
```

**Windows:**

1. Download installer from [GitHub Releases](https://github.com/UB-Mannheim/tesseract/wiki)
2. Add Tesseract to your system PATH
3. Verify installation: `tesseract --version`

**Verify Installation:**

```bash
tesseract --version
# Should output: tesseract 4.x.x or higher
```

#### 2. PDFTron WebViewer License

1. Visit [Apryse Developer Portal](https://dev.apryse.com/)
2. Sign up for a free trial account
3. Copy your license key (you'll need this later)

> **Note**: The free trial is sufficient for development and testing.

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd pdf-text-highlighter
```

### 2. Backend Setup (Flask Server)

```bash
# Navigate to server directory
cd server

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt


# Create .env file
cat > .env << EOF
FLASK_ENV=development
FLASK_DEBUG=True
PORT=8000
MAX_WORKERS=8
OCR_DPI=300
MIN_CONFIDENCE=15
EOF
```

**requirements.txt includes:**

```
Flask==3.0.0
flask-cors==4.0.0
PyMuPDF==1.23.8
pytesseract==0.3.10
Pillow==10.1.0
python-dotenv==1.0.0
psutil
rapidfuzz
```

### 3. Frontend Setup (Next.js Client)

```bash
# Navigate to client directory (from project root)
cd client/pdf-highlighter

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NEXT_PUBLIC_PDFTRON_LICENSE_KEY="your-license-key-here"
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
EOF
```

**Replace `your-license-key-here`** with your actual PDFTron license key from step 2 of Prerequisites.

### 4. Download PDFTron WebViewer

```bash
# Still in the client directory
# The WebViewer library will be installed via npm
# Copy the lib folder to public directory
npx webviewer-copy public/lib
```

> **Important**: Make sure `public/lib/webviewer` exists after this step.

## ▶️ Running the Application

### Start Backend Server

```bash
# In the server directory with activated virtual environment
cd server
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

The server will start on **http://localhost:8000**

### Start Frontend Application

```bash
# In a new terminal, navigate to client directory
cd client/pdf-highlighter
npm run dev
```

The application will start on **http://localhost:3000**

## 📖 Usage

### Basic Workflow

1. **Open the Application**

   - Navigate to `http://localhost:3000`

2. **Upload PDF**

   - Click "Upload PDF" or drag and drop a scanned PDF document
   - Supported format: PDF (scanned or image-based PDFs work best)

3. **Search Text**

   - Enter text to search in the input field
   - Click "Search" or press Enter
   - The system will perform OCR and highlight all matches

4. **Navigate Results**

   - Use ← → arrow buttons on the panel to jump between matches
   - Current match is highlighted in red borders
   - All matches are highlighted in orange
   - Click X to clear current highlight

5. **New Search**
   - Enter different text and search again

## ⚙️ Configuration

### Backend Configuration (server/.env)

```env
# Flask settings
FLASK_ENV=development        # development or production
FLASK_DEBUG=True            # Enable debug mode
PORT=8000                   # Server port

# OCR settings
MAX_WORKERS=8               # Number of parallel OCR workers
OCR_DPI=300                # DPI for PDF rendering (higher = better quality, slower)
MIN_CONFIDENCE=15          # Minimum OCR confidence threshold (0-100)
```

**Performance Tuning:**

- **MAX_WORKERS**: Set to number of CPU cores - 1 for optimal performance
- **OCR_DPI**:
  - 150: Fast, lower quality
  - 300: Balanced (recommended)
  - 600: Slow, high quality
- **MIN_CONFIDENCE**: Lower = more results but more false positives

### Frontend Configuration (client/.env.local)

```env
NEXT_PUBLIC_PDFTRON_LICENSE_KEY="your-license-key-here"
```

## 🧪 Testing

### Test with Sample PDF

1. Test with documents with varying pages
2. Test with documents with varying sizes.
3. Test with small text searches.
4. Test with longer text searches.
5. Test with 2 column layout pdf
6. Test with text that spans 2 pages. (would fail yet to be implemented.)

### Health Check

Test backend availability:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
	"status": "ok",
	"tesseract_available": true,
	"cache": {
		"cached_files": 0,
		"total_cached_pages": 0
	}
}
```

## 🐛 Troubleshooting

### Tesseract Not Found

**Error**: `TesseractNotFoundError`

**Solution**:

```bash
# Verify Tesseract is installed
tesseract --version

# If not installed, follow installation steps above

# On Windows, ensure Tesseract is in PATH
# Add to PATH: C:\Program Files\Tesseract-OCR
```

### PDFTron License Invalid

**Error**: License key error in browser console

**Solution**:

1. Verify your license key in `.env.local`
2. Ensure the key has no quotes inside the string
3. Restart the Next.js dev server after changing `.env.local`

### Port Already in Use

**Error**: `Address already in use`

**Solution**:

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or change port in server/.env
```

### WebViewer Not Loading

**Error**: `Cannot find module '@pdftron/webviewer'`

**Solution**:

```bash
cd client
npm install @pdftron/webviewer
npx webviewer-copy public/lib
```

### Upload Fails for Large PDFs

**Issue**: Upload times out or fails

**Solution**:

1. Increase chunk size in upload logic
2. Check available disk space in `server/tmp_uploads/`
3. Ensure adequate RAM (4GB minimum)

## 🔒 Security Considerations

- **File Upload**: Files are stored temporarily in `server/tmp_uploads/`
- **CORS**: Currently allows `localhost:3000` only
- **Production**: Update CORS settings and add authentication before deploying

## 🛠️ Technology Stack

### Frontend

- **Framework**: Next.js 16.0
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS 4
- **PDF Viewer**: PDFTron WebViewer 11.8
- **Icons**: Lucide React
- **Language**: TypeScript 5

### Backend

- **Framework**: Flask 3.0
- **OCR Engine**: Tesseract (via pytesseract)
- **PDF Processing**: PyMuPDF (fitz)
- **Fuzzy Matching**: RapidFuzz
- **Image Processing**: Pillow
- **Concurrency**: ProcessPoolExecutor

### Tools Used

- **AI Assistants**: Claude (Anthropic), GitHub Copilot (VS Code), Gemini (Google), ChatGPT (OpenAI)
- **Purpose**: Code generation, architecture planning, debugging assistance, and documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - Open source OCR engine
- [PDFTron/Apryse](https://www.pdftron.com/) - PDF viewing and annotation
- [PyMuPDF](https://pymupdf.readthedocs.io/) - PDF processing library
- [RapidFuzz](https://github.com/maxbachmann/RapidFuzz) - Fast string matching

## 📧 Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above
