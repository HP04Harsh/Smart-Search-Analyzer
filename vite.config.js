import chatHandler from "./api/chat.js";
import validateHandler from "./api/validate.js";

const API_ROUTES = new Map([
  ["/api/chat", chatHandler],
  ["/api/validate", validateHandler],
]);
const MAX_BODY_BYTES = 4_500_000;

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function localApiRoutes() {
  return {
    name: "smart-search-local-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url || "/", "http://localhost").pathname;
        const handler = API_ROUTES.get(path);
        if (!handler) {
          next();
          return;
        }

        let statusCode = 200;
        const headers = new Map();
        const apiResponse = {
          setHeader(name, value) {
            headers.set(name, value);
          },
          status(code) {
            statusCode = code;
            return this;
          },
          json(payload) {
            response.statusCode = statusCode;
            for (const [name, value] of headers) response.setHeader(name, value);
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(payload));
            return this;
          },
        };

        try {
          const body = path === "/api/chat" ? await readJsonBody(request) : undefined;
          await handler({ method: request.method, headers: request.headers, body }, apiResponse);
        } catch (error) {
          const status = error?.statusCode === 413 ? 413 : error?.statusCode === 400 ? 400 : 500;
          response.statusCode = status;
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({
            error: status === 413
              ? "Request body is too large. Choose a smaller image."
              : status === 400
                ? "Request body must be valid JSON."
                : "The local API route failed. Restart the Vite development server and try again.",
          }));
          server.config.logger.error("A local API request failed.", { error });
        }
      });
    },
  };
}

export default {
  plugins: [localApiRoutes()],
  server: { host: "127.0.0.1" },
};
