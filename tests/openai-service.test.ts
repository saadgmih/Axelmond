import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
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
  shouldUseLocalChatTutorFallback,
  toChatTutorClientResponse,
} from "../src/openai-service.ts";
import { trimChatTutorHistory } from "../src/chat-tutor-limits.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("openai-service", async () => {
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

  const serverSource = readApiRouteSources();
  assert.doesNotMatch(serverSource, /GEMINI_API_KEY|GoogleGenAI|@google\/genai|gemini-/i);
  assert.match(serverSource, /openai-service/);
  assert.match(serverSource, /generateChatTutorResponse/);

  assert.equal(new ChatTutorServiceError("test", "TIMEOUT", 504).statusCode, 504);
  assert.deepEqual(toChatTutorClientResponse(new ChatTutorServiceError("internal sdk leak", "AUTH_ERROR", 503)), {
    error: "Assistant temporairement indisponible.",
    code: "AUTH_ERROR",
  });
  assert.doesNotMatch(
    toChatTutorClientResponse(new ChatTutorServiceError("internal", "QUOTA_EXCEEDED", 503)).error,
    /OpenAI/i,
  );

  const trimmedHistory = trimChatTutorHistory([
    { role: "user", text: "a".repeat(8000) },
    { role: "model", text: "b".repeat(8000) },
  ]);
  assert.equal(trimmedHistory.length, 1);
  assert.ok(trimmedHistory[0]?.text.startsWith("b"));

  assert.equal(shouldUseLocalChatTutorFallback(new ChatTutorServiceError("quota", "QUOTA_EXCEEDED", 503)), true);
  process.env.OPENAI_API_KEY = "sk-test";
  assert.equal(shouldUseLocalChatTutorFallback(new ChatTutorServiceError("quota", "QUOTA_EXCEEDED", 503)), false);
  delete process.env.OPENAI_API_KEY;

  const openaiServiceSource = fs.readFileSync("src/openai-service.ts", "utf8");
  assert.match(openaiServiceSource, /insufficient_quota/);
  assert.match(openaiServiceSource, /OPENAI_FALLBACK_NOTICE/);

  if (previousOpenAIKey !== undefined) {
    process.env.OPENAI_API_KEY = previousOpenAIKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});
