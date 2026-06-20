import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dataDir = process.env.CI_POSTGRES_DATA_DIR;
const readyFile = process.env.CI_POSTGRES_READY_FILE;
const stopFile = process.env.CI_POSTGRES_STOP_FILE;
const pidFile = process.env.CI_POSTGRES_PID_FILE;
const database = process.env.CI_POSTGRES_DATABASE || "axelmond_ci";
const port = Number.parseInt(process.env.CI_POSTGRES_PORT || "5432", 10);
const moduleDir = process.env.CI_POSTGRES_MODULE_DIR?.trim();

if (!dataDir || !readyFile || !stopFile || !pidFile || !Number.isInteger(port)) {
  throw new Error("CI PostgreSQL paths and port must be configured");
}

await fsPromises.mkdir(path.dirname(dataDir), { recursive: true });
await Promise.all([readyFile, stopFile, pidFile].map((file) => fsPromises.rm(file, { force: true })));

const embeddedPostgresSpecifier = moduleDir
  ? pathToFileURL(createRequire(path.join(moduleDir, "package.json")).resolve("embedded-postgres")).href
  : "embedded-postgres";
const { default: EmbeddedPostgres } = await import(embeddedPostgresSpecifier);

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  onLog: (message) => console.log(`[ci-postgres] ${String(message)}`),
  onError: (error) => console.error(`[ci-postgres] ${String(error)}`),
});

let shuttingDown = false;
let stopMonitor;

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (stopMonitor) clearInterval(stopMonitor);
  console.log(`[ci-postgres] stopping (${reason})`);
  try {
    await postgres.stop();
  } catch (error) {
    console.error(`[ci-postgres] stop failed: ${String(error)}`);
    exitCode = 1;
  }
  await Promise.all([readyFile, pidFile].map((file) => fsPromises.rm(file, { force: true })));
  process.exit(exitCode);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase(database);
  await fsPromises.writeFile(pidFile, String(process.pid), "utf8");
  await fsPromises.writeFile(readyFile, "ready\n", "utf8");
  console.log(`[ci-postgres] ready on 127.0.0.1:${port}/${database}`);

  stopMonitor = setInterval(() => {
    if (fs.existsSync(stopFile)) void shutdown("stop file");
  }, 500);
} catch (error) {
  console.error(`[ci-postgres] startup failed: ${error instanceof Error ? error.stack : String(error)}`);
  await shutdown("startup failure", 1);
}
