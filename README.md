# 🧠 Smart Search & Analyzer  
### 🤖 Predictive AI by Harsh

An AI-powered web application built using **Streamlit + Groq LLM** that allows users to:

- 🔍 Ask anything (AI Chat)
- 📎 Upload and analyze files (PDF, DOCX, Images)
- 📷 Capture images using webcam
- 🗂️ Maintain conversation history

This project demonstrates real-world AI integration with a clean frontend and powerful backend processing.

---

# 🚀 Features

## 🔍 1. Ask Anything Mode
- Real-time AI question answering
- Powered by Groq Llama3 model
- Maintains conversation history

## 📎 2. File Upload & Analysis
Supports:
- PDF
- DOCX
- PNG / JPG / JPEG

Capabilities:
- Extract text from PDF using PyMuPDF
- Extract text from DOCX
- Display uploaded images
- AI-based summarization of uploaded content

## 📷 3. Camera Capture Mode
- Live webcam streaming
- Capture image from browser
- AI-based image description
- Stores conversation with timestamps

## 🗂️ Conversation History
- Automatic timestamp-based titles
- Sidebar conversation selector
- Multi-session conversation tracking

---

# 🏗️ Tech Stack

| Technology | Purpose |
|------------|----------|
| Python | Core backend logic |
| Streamlit | Web frontend |
| Groq (Llama3-8b-8192) | Large Language Model |
| PyMuPDF (fitz) | PDF text extraction |
| docx2txt | DOCX text extraction |
| streamlit-webrtc | Webcam integration |
| OpenCV | Image processing |
| PIL | Image handling |

---

# 📂 Project Structure

.
├── main.py
├── requirements.txt
├── .streamlit/
│ └── secrets.toml
├── SECURITY.md
└── README.md


---
# ⚙️ Installation & Setup Guide

This guide will walk you through the process of setting up the **Smart Search & Analyzer** on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
* **Python 3.8 or higher**
* **pip** (Python package installer)
* A [Groq Cloud Account](https://console.groq.com) to obtain an API key.

---

## 🚀 Step-by-Step Setup

### 1. Clone the Repository
Open your terminal or command prompt and run:
```bash
git clone [https://github.com/HP04Harsh/Smart-Search-Analyzer.git](https://github.com/HP04Harsh/Smart-Search-Analyzer.git)
cd Smart-Search-Analyzer
2. Create a Virtual Environment
It is highly recommended to use a virtual environment to avoid dependency conflicts.

On Windows:

Bash
python -m venv venv
venv\Scripts\activate
On Mac/Linux:

Bash
python3 -m venv venv
source venv/bin/activate
3. Install Dependencies
Install all required libraries using the requirements.txt file:

Bash
pip install -r requirements.txt
4. Configure Groq API Secrets
Streamlit uses a specific way to handle local secrets.

In the root directory, create a folder named .streamlit.

Inside that folder, create a file named secrets.toml.

Paste the following code into secrets.toml and replace the placeholder with your actual key:

Ini, TOML
[groq]
api_key = "gsk_your_actual_groq_api_key_here"
[!WARNING]
Never commit your secrets.toml file to GitHub. It is already included in the .gitignore to keep your API keys safe.

🖥️ Running the App
Once the setup is complete, launch the application by running:

Bash
streamlit run main.py
The application should automatically open in your default web browser at:
http://localhost:8501

🛠️ Troubleshooting
Webcam Issues: If the camera doesn't load, ensure no other application (like Zoom or Teams) is using your webcam.

ModuleNotFoundError: If you see this error, ensure your virtual environment is activated and you have run pip install -r requirements.txt.

API Errors: Double-check that your API key in secrets.toml is correct and has not expired.

