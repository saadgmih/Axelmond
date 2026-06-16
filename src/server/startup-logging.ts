/** Verbose startup diagnostics (schema names, integration keys, SMTP host, etc.). */
export function isVerboseStartup(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" || env.STARTUP_VERBOSE === "true";
}
