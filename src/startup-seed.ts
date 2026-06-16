/**
 * Controls whether seedDatabase() runs during server boot.
 * Production data is provisioned via Prisma migrations — re-seeding on every
 * boot caused Prisma engine panics on constrained Hostinger runtimes.
 */
export function shouldSkipStartupSeed(): boolean {
  const flag = process.env.RUN_STARTUP_SEED?.trim().toLowerCase();
  if (flag === "true") return false;
  if (flag === "false") return true;
  // Always skip seed on Hostinger shared hosting to avoid slow startup and Max Processes issues.
  if (process.env.HOSTINGER_WEBAPP === "1") return true;
  return process.env.NODE_ENV === "production";
}
