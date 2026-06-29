const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function readBooleanEnv(name: string): boolean | null {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return null;
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  return null;
}

export function shouldRunStartupMaintenancePurge(): boolean {
  const override = readBooleanEnv("RUN_STARTUP_PURGES");
  if (override !== null) return override;
  return process.env.HOSTINGER_WEBAPP !== "1";
}
