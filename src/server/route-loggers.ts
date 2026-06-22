function isInfoIgnoredInProduction(level: string, message: string): boolean {
  if (process.env.NODE_ENV !== "production" || level !== "INFO") {
    return false;
  }
  const msg = message.toLowerCase();
  return !(
    msg.includes("loaded") ||
    msg.includes("running") ||
    msg.includes("shutdown") ||
    msg.includes("verified") ||
    msg.includes("started") ||
    msg.includes("listening")
  );
}

export function logLiveKit(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  if (isInfoIgnoredInProduction(level, message)) return;
  console.log(`[${new Date().toISOString()}] [${level}] [livekit] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logInvitation(level: "INFO" | "WARN", message: string, data?: unknown) {
  if (isInfoIgnoredInProduction(level, message)) return;
  console.log(
    `[${new Date().toISOString()}] [${level}] [invitation] ${message}${data ? " " + JSON.stringify(data) : ""}`,
  );
}

export function logEmail(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  if (isInfoIgnoredInProduction(level, message)) return;
  console.log(`[${new Date().toISOString()}] [${level}] [email] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  if (isInfoIgnoredInProduction(level, message)) return;
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}
