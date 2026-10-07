import assert from "node:assert/strict";
import test from "node:test";
import chatHandler from "../api/chat.js";
import validateHandler from "../api/validate.js";

const TEST_KEY = "test_key_not_a_real_credential";

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("validates a visitor's key without returning model data", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };
  const response = responseRecorder();

  await validateHandler({ method: "POST", headers: { authorization: `Bearer ${TEST_KEY}` } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { valid: true });
  assert.equal(request.url, "https://api.groq.com/openai/v1/models");
  assert.equal(request.options.headers.Authorization, `Bearer ${TEST_KEY}`);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("rejects validation requests without a key before contacting Groq", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("fetch must not be called"); };
  const response = responseRecorder();

  await validateHandler({ method: "POST", headers: {} }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /API key/i);
});

test("relays text chat using the text model and keeps the key out of the response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Hello from Groq." } }] }),
    };
  };
  const response = responseRecorder();
  const messages = [{ role: "user", content: "Hello" }];

  await chatHandler({
    method: "POST",
    headers: { authorization: `Bearer ${TEST_KEY}` },
    body: { messages },
  }, response);

  const forwarded = JSON.parse(request.options.body);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { answer: "Hello from Groq." });
  assert.equal(request.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, `Bearer ${TEST_KEY}`);
  assert.equal(forwarded.model, "qwen/qwen3.8-27b");
  assert.deepEqual(forwarded.messages, messages);
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(TEST_KEY));
});

test("uses the vision model for a valid image request", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let forwarded;
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "A mountain." } }] }),
    };
  };
  const response = responseRecorder();

  await chatHandler({
    method: "POST",
    headers: { authorization: `Bearer ${TEST_KEY}` },
    body: {
      messages: [{ role: "user", content: "Describe this." }],
      imageData: "data:image/jpeg;base64,aGVsbG8=",
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(forwarded.model, "qwen/qwen3.8-27b");
  assert.deepEqual(forwarded.messages[0].content[1], {
    type: "image_url",
    image_url: { url: "data:image/jpeg;base64,aGVsbG8=" },
  });
});

test("rejects malformed messages and images without contacting Groq", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("fetch must not be called"); };
  const invalidBodies = [
    { messages: [{ role: "system", content: "Not allowed" }] },
    { messages: [{ role: "user", content: "Look" }], imageData: "https://example.com/image.png" },
  ];

  for (const body of invalidBodies) {
    const response = responseRecorder();
    await chatHandler({
      method: "POST",
      headers: { authorization: `Bearer ${TEST_KEY}` },
      body,
    }, response);
    assert.equal(response.statusCode, 400);
  }
});

test("does not reveal a rejected API key in an upstream error", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: `Invalid credential ${TEST_KEY}` } }),
  });
  const response = responseRecorder();

  await chatHandler({
    method: "POST",
    headers: { authorization: `Bearer ${TEST_KEY}` },
    body: { messages: [{ role: "user", content: "Hello" }] },
  }, response);

  assert.equal(response.statusCode, 401);
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(TEST_KEY));
});

test("explains when Groq cannot find the configured model", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: { message: "model not found" } }),
  });
  const response = responseRecorder();

  await chatHandler({
    method: "POST",
    headers: { authorization: `Bearer ${TEST_KEY}` },
    body: { messages: [{ role: "user", content: "Hello" }] },
  }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /model/i);
});
