import { AsyncUnzipInflate, Unzip } from "fflate";
import "./style.css";

const API_KEY_STORAGE = "smart-search-groq-key";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_CHARS = 80_000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_MESSAGE_CHARS = 2_000;

const elements = {
  modeButtons: [...document.querySelectorAll(".mode-button")],
  panels: [...document.querySelectorAll(".mode-panel")],
  modal: document.querySelector("#key-modal"),
  keyForm: document.querySelector("#key-form"),
  keyInput: document.querySelector("#api-key-input"),
  keyError: document.querySelector("#key-error"),
  connectButton: document.querySelector("#connect-button"),
  keySettings: document.querySelector("#key-settings"),
  keyStatus: document.querySelector("#key-status"),
  keyStatusDot: document.querySelector("#key-status-dot"),
  toggleKey: document.querySelector("#toggle-key"),
  chatForm: document.querySelector("#chat-form"),
  chatInput: document.querySelector("#chat-input"),
  chatMessages: document.querySelector("#chat-messages"),
  welcomeMessage: document.querySelector("#welcome-message"),
  fileInput: document.querySelector("#file-input"),
  chooseFile: document.querySelector("#choose-file"),
  dropZone: document.querySelector("#drop-zone"),
  fileResult: document.querySelector("#file-result"),
  cameraStart: document.querySelector("#camera-start"),
  cameraCapture: document.querySelector("#camera-capture"),
  cameraVideo: document.querySelector("#camera-video"),
  cameraCanvas: document.querySelector("#camera-canvas"),
  cameraPlaceholder: document.querySelector("#camera-placeholder"),
  cameraMessage: document.querySelector("#camera-message"),
  toast: document.querySelector("#toast"),
};

const conversation = [];
let selectedMode = "chat";
let busy = false;
let cameraStream = null;
let toastTimer = null;

function getApiKey() {
  return sessionStorage.getItem(API_KEY_STORAGE);
}

function showKeyDialog(message = "") {
  elements.keyError.hidden = !message;
  elements.keyError.textContent = message;
  elements.keyInput.value = "";
  elements.modal.hidden = false;
  requestAnimationFrame(() => elements.keyInput.focus());
}

function updateKeyStatus() {
  const connected = Boolean(getApiKey());
  elements.keyStatus.textContent = connected ? "Groq API connected" : "API key not connected";
  elements.keyStatusDot.classList.toggle("connected", connected);
}

function setMode(mode) {
  selectedMode = mode;
  for (const button of elements.modeButtons) {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  }
  for (const panel of elements.panels) {
    const active = panel.dataset.panel === mode;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  }
  if (mode !== "camera") {
    stopCamera();
  }
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 4000);
}

function appendMessage(role, content, pending = false) {
  elements.welcomeMessage.hidden = true;
  const item = document.createElement("article");
  item.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "PREDICTIVE AI";
  const text = document.createElement("p");
  text.className = "message-content";
  text.textContent = content;
  item.append(label, text);
  if (pending) {
    item.classList.add("pending-message");
    text.textContent = "Thinking…";
  }
  elements.chatMessages.append(item);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return { item, text };
}

async function askGroq(prompt, imageData = undefined, historyPrompt = prompt) {
  if (busy) return;
  const apiKey = getApiKey();
  if (!apiKey) {
    showKeyDialog();
    return;
  }

  busy = true;
  const priorMessages = conversation.slice(-MAX_HISTORY_MESSAGES).map((message) => (
    message.content.length <= MAX_HISTORY_MESSAGE_CHARS
      ? message
      : { ...message, content: `${message.content.slice(0, MAX_HISTORY_MESSAGE_CHARS)}\n[Earlier content shortened.]` }
  ));
  const requestMessages = [...priorMessages, { role: "user", content: prompt }];
  const userMessage = appendMessage("user", historyPrompt);
  const pendingMessage = appendMessage("assistant", "", true);
  setBusy(true);

  try {
    const result = await fetch("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: requestMessages, ...(imageData ? { imageData } : {}) }),
    });
    if (!result.headers.get("content-type")?.includes("application/json")) {
      throw new Error("The local UI server does not provide the Groq API routes. Restart it with `npm run dev`.");
    }
    const payload = await result.json().catch(() => ({}));
    if (!result.ok) {
      if (result.status === 401) {
        sessionStorage.removeItem(API_KEY_STORAGE);
        updateKeyStatus();
        showKeyDialog(payload.error || "Groq rejected this key. Enter a valid key to continue.");
      }
      throw new Error(payload.error || `Request failed (${result.status}).`);
    }
    const answer = payload.answer;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("Groq returned an empty response. Please try again.");
    }
    pendingMessage.text.textContent = answer;
    pendingMessage.item.classList.remove("pending-message");
    conversation.push({ role: "user", content: historyPrompt }, { role: "assistant", content: answer });
  } catch (error) {
    pendingMessage.item.remove();
    userMessage.item.remove();
    elements.welcomeMessage.hidden = conversation.length > 0;
    showToast(error instanceof Error ? error.message : "The request failed. Please try again.", true);
  } finally {
    busy = false;
    setBusy(false);
  }
}

function setBusy(value) {
  elements.chatForm.querySelector("button[type=submit]").disabled = value;
  elements.chatInput.disabled = value;
  elements.connectButton.disabled = value;
  elements.cameraCapture.disabled = value || !cameraStream;
  const analyzeButton = elements.fileResult.querySelector("[data-analyze]");
  if (analyzeButton) analyzeButton.disabled = value;
}

function renderFileResult(file, content, imageData = undefined) {
  elements.fileResult.replaceChildren();
  elements.fileResult.hidden = false;

  const fileHeading = document.createElement("div");
  fileHeading.className = "file-heading";
  const fileInfo = document.createElement("div");
  fileInfo.className = "file-info";
  const fileName = document.createElement("strong");
  fileName.textContent = file.name;
  const fileSize = document.createElement("span");
  fileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  fileInfo.append(fileName, fileSize);
  const removeButton = document.createElement("button");
  removeButton.className = "icon-button";
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    elements.fileResult.hidden = true;
    elements.fileInput.value = "";
  });
  fileHeading.append(fileInfo, removeButton);
  elements.fileResult.append(fileHeading);

  if (imageData) {
    const image = document.createElement("img");
    image.className = "file-preview-image";
    image.alt = `Preview of ${file.name}`;
    image.src = imageData;
    elements.fileResult.append(image);
  } else {
    const preview = document.createElement("p");
    preview.className = "file-preview-text";
    preview.textContent = `${content.slice(0, 500)}${content.length > 500 ? "…" : ""}`;
    elements.fileResult.append(preview);
  }

  const promptInput = document.createElement("textarea");
  promptInput.className = "file-prompt";
  promptInput.rows = 2;
  promptInput.maxLength = 4000;
  promptInput.placeholder = imageData
    ? "What would you like to know about this image?"
    : "What would you like to know about this document?";
  promptInput.value = imageData ? "Describe this image in simple terms." : "Summarize this document in simple terms.";
  const analyzeButton = document.createElement("button");
  analyzeButton.className = "primary-button analyze-button";
  analyzeButton.type = "button";
  analyzeButton.dataset.analyze = "";
  analyzeButton.textContent = "Analyze with Groq";
  analyzeButton.addEventListener("click", () => {
    const question = promptInput.value.trim() || (imageData ? "Describe this image." : "Summarize this document.");
    const fullPrompt = imageData ? question : `${question}\n\nDocument text:\n${content}`;
    void askGroq(fullPrompt, imageData, question);
  });
  elements.fileResult.append(promptInput, analyzeButton);
}

async function extractPdf(file, pdfjsLib) {
  const documentData = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const text = [];
  let size = 0;
  for (let pageNumber = 1; pageNumber <= documentData.numPages; pageNumber += 1) {
    const page = await documentData.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    text.push(pageText);
    size += pageText.length;
    if (size >= MAX_DOCUMENT_CHARS) break;
  }
  return text.join("\n").slice(0, MAX_DOCUMENT_CHARS);
}

async function extractDocx(file) {
  const archive = new Uint8Array(await file.arrayBuffer());
  const chunks = [];
  let documentFound = false;
  let outputSize = 0;
  return new Promise((resolve, reject) => {
    const unzip = new Unzip((entry) => {
      if (entry.name !== "word/document.xml") {
        entry.terminate();
        return;
      }
      documentFound = true;
      entry.ondata = (error, chunk, final) => {
        if (error) {
          reject(new Error("This DOCX file is damaged or uses unsupported compression."));
          entry.terminate();
          return;
        }
        outputSize += chunk.length;
        if (outputSize > MAX_DOCUMENT_CHARS * 4) {
          reject(new Error("This document contains too much text to safely process."));
          entry.terminate();
          return;
        }
        chunks.push(chunk);
        if (final) {
          const xmlBytes = new Uint8Array(outputSize);
          let offset = 0;
          for (const part of chunks) {
            xmlBytes.set(part, offset);
            offset += part.length;
          }
          const xmlText = new TextDecoder().decode(xmlBytes);
          const xmlDocument = new DOMParser().parseFromString(xmlText, "application/xml");
          if (xmlDocument.querySelector("parsererror")) {
            reject(new Error("Could not read the text in this DOCX file."));
            return;
          }
          const paragraphs = [...xmlDocument.getElementsByTagNameNS(
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "p",
          )];
          const documentText = paragraphs
            .map((paragraph) => [...paragraph.getElementsByTagNameNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "t",
            )].map((node) => node.textContent || "").join(""))
            .join("\n");
          resolve(documentText.slice(0, MAX_DOCUMENT_CHARS));
        }
      };
      entry.start();
    });
    unzip.register(AsyncUnzipInflate);
    try {
      unzip.push(archive, true);
      if (!documentFound) reject(new Error("This file does not contain a readable Word document."));
    } catch {
      reject(new Error("This DOCX file is damaged or uses unsupported compression."));
    }
  });
}

async function handleFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE_BYTES) {
    showToast("Choose a file smaller than 10 MB.", true);
    return;
  }
  if (!getApiKey()) {
    showKeyDialog();
    return;
  }

  elements.fileResult.hidden = true;
  showToast(`Reading ${file.name}…`);
  try {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (file.type === "application/pdf" || extension === "pdf") {
      const pdfjsLib = await import("pdfjs-dist");
      const { default: pdfWorkerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const text = await extractPdf(file, pdfjsLib);
      if (!text.trim()) {
        throw new Error("No selectable text was found in this PDF. Scanned PDFs need OCR, which is not available yet.");
      }
      renderFileResult(file, text);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      extension === "docx"
    ) {
      const text = await extractDocx(file);
      if (!text.trim()) throw new Error("No text was found in this DOCX file.");
      renderFileResult(file, text);
    } else if (["image/png", "image/jpeg", "image/webp"].includes(file.type) || ["png", "jpg", "jpeg"].includes(extension)) {
      const imageData = await readImageAsDataUrl(file);
      renderFileResult(file, "", imageData);
    } else {
      throw new Error("Choose a PDF, DOCX, PNG, or JPG file.");
    }
    showToast("File ready to analyze.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not read this file.", true);
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not read this image."));
    });
    image.src = imageUrl;
  });
}

async function startCamera() {
  if (!getApiKey()) {
    showKeyDialog();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Camera access is not available in this browser. Use HTTPS or localhost.", true);
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    elements.cameraVideo.srcObject = cameraStream;
    elements.cameraVideo.hidden = false;
    elements.cameraPlaceholder.hidden = true;
    elements.cameraStart.textContent = "Stop camera";
    elements.cameraCapture.disabled = false;
    elements.cameraMessage.textContent = "Your camera preview stays on this device until you choose to capture.";
  } catch (error) {
    showToast(error instanceof Error && error.name === "NotAllowedError"
      ? "Allow camera access in your browser, then try again."
      : "Could not start the camera. Check that it is connected and not in use.", true);
  }
}

function stopCamera() {
  if (cameraStream) {
    for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null;
  }
  elements.cameraVideo.srcObject = null;
  elements.cameraVideo.hidden = true;
  elements.cameraPlaceholder.hidden = false;
  elements.cameraStart.textContent = "Start camera";
  elements.cameraCapture.disabled = true;
}

async function captureAndDescribe() {
  if (!cameraStream || busy) return;
  const video = elements.cameraVideo;
  const canvas = elements.cameraCanvas;
  if (!video.videoWidth || !video.videoHeight) {
    showToast("The camera is still starting. Try again in a moment.", true);
    return;
  }
  const scale = Math.min(1, 1280 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/jpeg", 0.82);
  stopCamera();
  await askGroq("Describe the contents of this image in simple terms.", imageData);
}

elements.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));

elements.keyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = elements.keyInput.value.trim();
  if (!apiKey) {
    elements.keyError.textContent = "Enter your Groq API key to continue.";
    elements.keyError.hidden = false;
    return;
  }
  elements.connectButton.disabled = true;
  elements.connectButton.innerHTML = "Checking key…";
  elements.keyError.hidden = true;
  try {
    const result = await fetch("/api/validate", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!result.headers.get("content-type")?.includes("application/json")) {
      throw new Error("The local UI server does not provide the Groq API routes. Restart it with `npm run dev`.");
    }
    const payload = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(payload.error || "Could not validate the key.");
    sessionStorage.setItem(API_KEY_STORAGE, apiKey);
    elements.modal.hidden = true;
    elements.keyInput.value = "";
    updateKeyStatus();
    showToast("Groq API connected for this browser tab.");
  } catch (error) {
    elements.keyError.textContent = error instanceof Error ? error.message : "Could not validate the key. Check your connection and try again.";
    elements.keyError.hidden = false;
  } finally {
    elements.connectButton.disabled = false;
    elements.connectButton.innerHTML = 'Connect securely <span aria-hidden="true">↗</span>';
  }
});

elements.keySettings.addEventListener("click", () => {
  if (getApiKey()) {
    if (window.confirm("Disconnect Groq and remove the key from this browser tab?")) {
      sessionStorage.removeItem(API_KEY_STORAGE);
      updateKeyStatus();
      showKeyDialog();
    }
  } else {
    showKeyDialog();
  }
});

elements.toggleKey.addEventListener("click", () => {
  const show = elements.keyInput.type === "password";
  elements.keyInput.type = show ? "text" : "password";
  elements.toggleKey.textContent = show ? "Hide" : "Show";
  elements.toggleKey.setAttribute("aria-label", show ? "Hide API key" : "Show API key");
});

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = elements.chatInput.value.trim();
  if (!prompt) return;
  elements.chatInput.value = "";
  elements.chatInput.style.height = "auto";
  void askGroq(prompt);
});

elements.chatInput.addEventListener("input", () => {
  elements.chatInput.style.height = "auto";
  elements.chatInput.style.height = `${Math.min(elements.chatInput.scrollHeight, 180)}px`;
});

elements.chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
});

elements.chooseFile.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => {
  void handleFile(elements.fileInput.files?.[0]);
});
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("drag-over");
});
elements.dropZone.addEventListener("dragleave", () => elements.dropZone.classList.remove("drag-over"));
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("drag-over");
  void handleFile(event.dataTransfer?.files?.[0]);
});
elements.cameraStart.addEventListener("click", () => {
  if (cameraStream) stopCamera();
  else void startCamera();
});
elements.cameraCapture.addEventListener("click", () => void captureAndDescribe());

window.addEventListener("pagehide", stopCamera);
updateKeyStatus();
if (!getApiKey()) showKeyDialog();
