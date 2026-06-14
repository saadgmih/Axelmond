export function logLiveKit(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [livekit] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logInvitation(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(
    `[${new Date().toISOString()}] [${level}] [invitation] ${message}${data ? " " + JSON.stringify(data) : ""}`,
  );
}

export function logEmail(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [email] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

export function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}
