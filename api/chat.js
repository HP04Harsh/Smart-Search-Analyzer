const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "qwen/qwen3.8-27b";
const MAX_PROMPT_CHARS = 100_000;
const MAX_IMAGE_URL_CHARS = 3_000_000;
const MAX_MESSAGES = 20;

function safeErrorMessage(value, apiKey) {
  if (typeof value !== "string" || !value.trim()) {
    return "Groq could not complete this request. Please try again.";
  }
  return value.replaceAll(apiKey, "[redacted]").slice(0, 500);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!apiKey || apiKey.length > 512) {
    return response.status(400).json({ error: "Connect a valid Groq API key first." });
  }

  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({ error: "The request body must be valid JSON." });
  }

  const { messages, imageData } = body;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) {
    return response.status(400).json({ error: "Send between 1 and 20 chat messages." });
  }

  const safeMessages = [];
  let totalTextLength = 0;
  for (const message of messages) {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string"
    ) {
      return response.status(400).json({ error: "A chat message has an unsupported format." });
    }
    totalTextLength += message.content.length;
    safeMessages.push({ role: message.role, content: message.content });
  }

  if (totalTextLength > MAX_PROMPT_CHARS) {
    return response.status(413).json({ error: "This document is too large to analyze. Try a shorter file." });
  }

  if (imageData !== undefined) {
    if (
      typeof imageData !== "string" ||
      imageData.length > MAX_IMAGE_URL_CHARS ||
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(imageData)
    ) {
      return response.status(400).json({ error: "This image is not supported or is too large." });
    }
    const lastMessage = safeMessages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return response.status(400).json({ error: "An image must be attached to a user message." });
    }
    lastMessage.content = [
      { type: "text", text: lastMessage.content || "Describe this image in simple terms." },
      { type: "image_url", image_url: { url: imageData } },
    ];
  }

  try {
    const result = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: safeMessages,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    });

    const payload = await result.json().catch(() => null);
    if (!result.ok) {
      const status = result.status === 401 ? 401 : result.status === 429 ? 429 : 502;
      const message = result.status === 401
        ? "Groq rejected this API key. Reconnect with a valid key."
        : safeErrorMessage(payload?.error?.message, apiKey);
      return response.status(status).json({ error: message });
    }

    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return response.status(502).json({ error: "Groq returned an empty response. Please try again." });
    }
    return response.status(200).json({ answer });
  } catch {
    return response.status(502).json({ error: "Could not reach Groq. Please try again." });
  }
}
