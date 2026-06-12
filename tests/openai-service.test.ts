import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildChatTutorSystemInstruction,
  ChatTutorServiceError,
  DEFAULT_OPENAI_MODEL,
  generateChatTutorResponse,
  getLocalChatTutorFallback,
  getOpenAIModelName,
  initializeOpenAIService,
  isOpenAIConfigured,
} from "../src/openai-service.ts";

const previousOpenAIKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_MODEL;

assert.equal(isOpenAIConfigured(), false);
assert.equal(getOpenAIModelName(), DEFAULT_OPENAI_MODEL);

const systemInstruction = buildChatTutorSystemInstruction("Algorithmique", "Complexité");
assert.match(systemInstruction, /Algorithmique/);
assert.match(systemInstruction, /Complexité/);
assert.match(systemInstruction, /français, arabe ou anglais/i);

const fallback = getLocalChatTutorFallback("Quelle est la complexité O(n) ?", "Algorithmique", "Complexité");
assert.match(fallback, /Complexité Temporelle/i);

const localResponse = await generateChatTutorResponse({
  courseName: "Algorithmique",
  moduleName: "Complexité",
  prompt: "Expliquez SQL",
});
assert.match(localResponse, /SQL/i);

initializeOpenAIService();

const serverSource = fs.readFileSync("server.ts", "utf8");
assert.doesNotMatch(serverSource, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-/i);
assert.match(serverSource, /openai-service/);
assert.match(serverSource, /generateChatTutorResponse/);

assert.equal(new ChatTutorServiceError("test", "TIMEOUT", 504).statusCode, 504);

if (previousOpenAIKey !== undefined) {
  process.env.OPENAI_API_KEY = previousOpenAIKey;
} else {
  delete process.env.OPENAI_API_KEY;
}

console.log("OpenAI service tests passed");
