# Smart Search & Analyzer

A Streamlit application for asking questions with Groq, extracting text from PDF and Word documents, and trying a browser-based camera capture workflow.

> **Status:** This is a small demonstration project. Review the limitations and privacy notes below before using it with sensitive information or relying on image descriptions.

## Screenshots

### Ask Anything

![Ask Anything screen](screenshots/ask-anything.png)

### Camera Capture

![Camera Capture screen](screenshots/camera-capture.png)

## Features

| Feature | Current behavior |
| --- | --- |
| Ask Anything | Sends a text prompt to the configured Groq chat model and displays its response. |
| PDF and DOCX upload | Extracts document text locally, displays a preview, and sends the extracted text to Groq for a summary. |
| Image upload | Displays supported PNG and JPEG images in the app. Image pixels are **not** currently sent to a vision model. |
| Camera capture | Captures and displays a browser camera frame. The current implementation sends a text-only prompt—not the captured image—to the chat model, so its response is not grounded in the image. |
| Conversation history | Shows conversations held in the active Streamlit session. History is not saved to a database and may be lost when the session ends. |

## Technology

- Python and Streamlit
- Groq chat API via `langchain-groq`
- PyMuPDF for PDF text extraction
- `docx2txt` for DOCX text extraction
- Pillow, OpenCV, and `streamlit-webrtc` for image and camera UI

## Requirements

- Python 3.11 recommended (Python 3.10 or newer)
- pip
- A Groq account and API key: [console.groq.com](https://console.groq.com/)
- A modern browser; camera access requires permission and may require HTTPS outside localhost

## Installation

### Windows (PowerShell)

```powershell
git clone https://github.com/HP04Harsh/Smart-Search-Analyzer.git
cd Smart-Search-Analyzer

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks virtual-environment activation, run the environment's Python directly instead:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### macOS and Linux

```bash
git clone https://github.com/HP04Harsh/Smart-Search-Analyzer.git
cd Smart-Search-Analyzer

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Configure the Groq API key

Create `.streamlit/secrets.toml` in the project directory. Start from the safe example:

```powershell
# Windows PowerShell
Copy-Item .streamlit\secrets.toml.example .streamlit\secrets.toml
notepad .streamlit\secrets.toml
```

```bash
# macOS / Linux
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
```

Set the file contents to the following, replacing the placeholder with your own key:

```toml
[groq]
api_key = "YOUR_GROQ_API_KEY"
```

The local `secrets.toml` file is ignored by Git. **Never commit, paste into an issue, or share an API key.** If a key has been exposed, revoke it in the provider dashboard and create a replacement. Do not use a key that has appeared in public Git history.

## Run

From the project directory with the virtual environment activated:

```bash
streamlit run main.py
```

Or, on Windows without activating the environment:

```powershell
.\.venv\Scripts\python.exe -m streamlit run main.py
```

Open [http://localhost:8501](http://localhost:8501). For camera capture, allow camera access when prompted. On a remote deployment, serve the app over HTTPS for browser camera permissions.

## Usage

1. Choose **Ask Anything**, **Upload File**, or **Camera Capture** in the sidebar.
2. Enter a question, upload a supported PDF/DOCX/PNG/JPEG file, or start the camera.
3. Review the response and the session's conversation history in the app.

For document uploads, extracted text is sent to Groq. Avoid uploading confidential or personal documents unless you have reviewed the provider's data-handling terms and have permission to share that content.

## Cost considerations

There is no separate license or per-user charge built into this repository. Actual operating cost depends on where the app is hosted and how often it calls the Groq API.

| Cost area | What to expect |
| --- | --- |
| Running locally | No application hosting fee; your computer and internet connection are yours to provide. |
| Groq API | Pricing, free-tier quotas, model availability, and rate limits depend on the selected model and can change. Check [Groq pricing](https://groq.com/pricing) and your account's current limits. |
| Hosting | Local use has no hosting bill. A hosted deployment may be free or paid depending on the provider, plan, usage, and network requirements. |
| Webcam | The browser camera feature itself does not add a separate API charge; hosting and network usage may still apply. |

For a model with published per-token prices, estimate API usage as:

```text
estimated cost =
  (input tokens / 1,000,000 × current input price per 1M tokens)
  + (output tokens / 1,000,000 × current output price per 1M tokens)
```

Each question, document summary, and camera-mode prompt can make an API request. Long documents can use more input tokens and may exceed model limits. The application does not currently track token usage or calculate a bill; use the provider dashboard for actual usage. No fixed price estimate is quoted here because model prices, quotas, and availability change.

## Project layout

```text
.
├── main.py
├── requirements.txt
├── .streamlit/
│   └── secrets.toml.example
├── screenshots/
│   ├── ask-anything.png
│   └── camera-capture.png
└── .devcontainer/
    └── devcontainer.json
```

## Troubleshooting

- **Missing Groq key:** Confirm `.streamlit/secrets.toml` exists and contains a `[groq]` section with `api_key`.
- **Authentication or API error:** Check that the key is valid, has not been revoked, and that your Groq account permits the configured model.
- **Model unavailable:** The model name is configured in `main.py`. Check Groq's current model catalog and update the configured model if it has changed or been retired.
- **Missing Python modules:** Activate the virtual environment and run `pip install -r requirements.txt` again.
- **Camera not available:** Allow camera access, check that another app is not using it, and use HTTPS when accessing the app remotely.
- **Document too large:** Shorten or split the document; the full extracted text is sent to the model and can exceed its context limit.

## Privacy and security

- Keep API keys in local secrets or a deployment secrets manager; never commit credentials.
- Text extracted from documents and prompts are sent to the configured Groq API.
- Uploaded image pixels and camera frames are not currently submitted to a vision model by this implementation.
- Conversation history is held in Streamlit session state, not durable storage.
- Do not rely on model output as professional, legal, medical, or financial advice.

## Contributing

Use a virtual environment, install `requirements.txt`, and verify the app starts locally before submitting a change. Do not include secrets, personal data, or generated local environment files in commits.
