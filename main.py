import streamlit as st
import fitz  # PyMuPDF
import docx2txt
import tempfile
import os
from PIL import Image
from langchain_groq import ChatGroq
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase
import av
import cv2
import numpy as np
import datetime

# --- App Config ---
st.set_page_config(page_title="🧠 Smart Search & Analyzer", layout="centered")
st.markdown("## 🤖 Predictive AI by Harsh")

# --- Initialize ChatGroq ---
llm = ChatGroq(
    groq_api_key=st.secrets["groq"]["api_key"],  
    model_name="Llama3-8b-8192",
    temperature=0.7
)

# --- Initialize session state ---
if "conversations" not in st.session_state:
    st.session_state.conversations = {}
if "current_title" not in st.session_state:
    st.session_state.current_title = None
if "last_mode" not in st.session_state:
    st.session_state.last_mode = None

# --- Generate unique conversation titles ---
def generate_title(prefix):
    return f"{prefix} | {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

# --- Extract text from files ---
def extract_text(file):
    if file.type == "application/pdf":
        doc = fitz.open(stream=file.read(), filetype="pdf")
        return "".join(page.get_text() for page in doc)
    elif file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
            tmp.write(file.read())
            text = docx2txt.process(tmp.name)
            os.unlink(tmp.name)
        return text
    elif file.type.startswith("image/"):
        image = Image.open(file)
        st.image(image, caption="Uploaded Image", use_column_width=True)
        return "This is an uploaded image. Please describe the content."
    return "Unsupported file type."

# --- Sidebar for mode selection and history ---
st.sidebar.title("🔧 Choose a Feature")
mode = st.sidebar.radio("Select Mode", ["🔍 Ask Anything", "📎 Upload File", "📷 Camera Capture"])

st.sidebar.markdown("### 🗂️ Conversation History")
selected_title = st.sidebar.selectbox(
    "Select a conversation to view:",
    list(st.session_state.conversations.keys())[::-1],  # Most recent first
    index=0 if st.session_state.conversations else None
)

# --- Mode 1: Ask Anything ---
if mode == "🔍 Ask Anything":
    search_input = st.text_input("🔍 Ask Anything", placeholder="Enter your question")

    if search_input:
        try:
            response = llm.invoke(search_input)
            answer = response.content if hasattr(response, "content") else response

            if st.session_state.last_mode != "ask":
                st.session_state.current_title = generate_title("Ask")
                st.session_state.last_mode = "ask"

            title = st.session_state.current_title
            st.session_state.conversations.setdefault(title, []).append(("You", search_input))
            st.session_state.conversations[title].append(("AI", answer))

            st.markdown("### 🤖 PredictiveAI Answer:")
            st.success(answer)
        except Exception as e:
            st.error(f"❌ Error: {e}")

# --- Mode 2: Upload File ---
elif mode == "📎 Upload File":
    uploaded_file = st.file_uploader("📎 Upload PDF, DOCX, PNG or JPG", type=["pdf", "docx", "png", "jpg", "jpeg"])

    if uploaded_file:
        extracted_text = extract_text(uploaded_file)
        st.markdown("### 📄 Extracted Text:")
        st.info(extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text)

        try:
            prompt = f"Summarize or describe the following content in simple terms:\n\n{extracted_text}"
            response = llm.invoke(prompt)
            answer = response.content if hasattr(response, "content") else response

            if st.session_state.last_mode != "upload":
                st.session_state.current_title = generate_title("Upload")
                st.session_state.last_mode = "upload"

            title = st.session_state.current_title
            st.session_state.conversations.setdefault(title, []).append(("File", uploaded_file.name))
            st.session_state.conversations[title].append(("AI", answer))

            st.markdown("### 🤖 PredictiveAI Summary:")
            st.success(answer)
        except Exception as e:
            st.error(f"❌ Error: {e}")

# --- Mode 3: Camera Capture ---
elif mode == "📷 Camera Capture":
    st.info("📸 Click 'Start' and capture an image")

    class VideoProcessor(VideoTransformerBase):
        def __init__(self):
            self.frame = None

        def transform(self, frame: av.VideoFrame) -> np.ndarray:
            image = frame.to_ndarray(format="bgr24")
            self.frame = image
            return image

    ctx = webrtc_streamer(
        key="camera",
        video_processor_factory=VideoProcessor,
        media_stream_constraints={"video": True, "audio": False},
        async_processing=True
    )

    if ctx.video_processor:
        if st.button("📸 Capture Image"):
            frame = ctx.video_processor.frame
            if frame is not None:
                image_path = os.path.join(tempfile.gettempdir(), "webcam_capture.jpg")
                cv2.imwrite(image_path, frame)
                image = Image.open(image_path)
                st.image(image, caption="Captured Image", use_column_width=True)

                try:
                    prompt = "Describe the contents of this image in simple terms."
                    response = llm.invoke(prompt)
                    answer = response.content if hasattr(response, "content") else response

                    if st.session_state.last_mode != "camera":
                        st.session_state.current_title = generate_title("Camera")
                        st.session_state.last_mode = "camera"

                    title = st.session_state.current_title
                    st.session_state.conversations.setdefault(title, []).append(("Image", "Captured Image"))
                    st.session_state.conversations[title].append(("AI", answer))

                    st.markdown("### 🤖 PredictiveAI Description:")
                    st.success(answer)
                except Exception as e:
                    st.error(f"❌ Error: {e}")
            else:
                st.warning("⚠️ No frame captured. Try again.")

# --- Show full selected conversation ---
if selected_title:
    st.markdown(f"## 💬 Conversation: {selected_title}")
    for speaker, message in st.session_state.conversations[selected_title]:
        st.markdown(f"**{speaker}:** {message}")
        st.markdown("---")
