const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!apiKey || apiKey.length > 512) {
    return response.status(400).json({ error: "Enter a valid Groq API key." });
  }

  try {
    const result = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!result.ok) {
      return response.status(result.status === 401 ? 401 : 502).json({
        error: result.status === 401
          ? "Groq rejected this API key. Check it and try again."
          : "Groq could not validate the key right now. Please try again.",
      });
    }

    return response.status(200).json({ valid: true });
  } catch {
    return response.status(502).json({ error: "Could not reach Groq. Please try again." });
  }
}
