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

# ⚙️ Installation & Setup

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/your-repository-name.git
cd your-repository-name
2️⃣ Create Virtual Environment (Recommended)
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
3️⃣ Install Dependencies
pip install -r requirements.txt
4️⃣ Setup Groq API Key
Create:

.streamlit/secrets.toml
Add:

[groq]
api_key = "your_groq_api_key_here"
Get your API key from:
👉 https://console.groq.com

5️⃣ Run the Application
streamlit run main.py
App runs at:

http://localhost:8501
🧠 Model Used
Llama3-8b-8192

Running via Groq API

Optimized for fast inference

🔐 Security
API keys are stored securely in .streamlit/secrets.toml

.env or secret files should not be committed

SECURITY.md included for best practices

🎯 What This Project Demonstrates
AI Integration in Web Apps

Real-time LLM invocation

File processing and summarization

Webcam streaming in Streamlit

Session state management

Production-ready structure

📈 Future Improvements
Add chat memory context to LLM

Add multi-model support

Add authentication system

Deploy on Streamlit Cloud

Add vector search for document Q&A

👨‍💻 Author
Harsh
Built with passion for AI & intelligent systems 🚀

⭐ If You Like This Project
Give it a ⭐ on GitHub and support the work!
