import fs from "node:fs";

const DEBUG_LOG =
  "C:/Users/saadg/.cursor/projects/c-Users-saadg-Downloads-PortableGit-usr-lib-perl5-core-perl-auto-Encode-Unicode/debug-4a3252.log";
const INGEST_URL = "http://127.0.0.1:7908/ingest/313aa125-9bdc-4150-89fa-cbf8bc125e63";

export function agentDebugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
}) {
  const line = JSON.stringify({
    sessionId: "4a3252",
    timestamp: Date.now(),
    ...payload,
  });
  // #region agent log
  try {
    if (typeof window === "undefined") {
      fs.appendFileSync(DEBUG_LOG, `${line}\n`);
    }
  } catch {
    /* ignore */
  }
  if (typeof fetch !== "undefined") {
    fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4a3252" },
      body: line,
    }).catch(() => {});
  }
  // #endregion
}
