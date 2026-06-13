/**
 * Remove extracted route/shared sections from server.ts and insert modular wiring.
 * Run: node scripts/slim-server.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const serverPath = path.join(root, "server.ts");
const lines = fs.readFileSync(serverPath, "utf8").split("\n");

const deleteRanges = [
  [299, 350],
  [709, 791],
  [924, 2024],
  [2026, 5424],
];

function shouldKeep(lineIndex1Based) {
  return !deleteRanges.some(([start, end]) => lineIndex1Based >= start && lineIndex1Based <= end);
}

const kept = lines.filter((_, i) => shouldKeep(i + 1));

const importInsert = [
  'import * as routeDeps from "./src/server/route-deps";',
  'import { createRouteContext } from "./src/server/route-context";',
  'import { registerApiRoutes } from "./src/routes/register-api-routes";',
  'import { registerPayPalWebhook } from "./src/routes/payments-routes";',
];

const lastImportIndex = kept.findLastIndex((line) => line.startsWith("import "));
kept.splice(lastImportIndex + 1, 0, ...importInsert);

const cookieParserIndex = kept.findIndex((line) => line.includes("app.use(cookieParser());"));
if (cookieParserIndex === -1) throw new Error("cookieParser not found");

kept.splice(cookieParserIndex + 1, 0,
  "",
  "const routeCtx = createRouteContext(routeDeps);",
  "registerPayPalWebhook(app, routeCtx);",
);

const timingMiddlewareIndex = kept.findIndex((line) => line.includes('app.use("/api", requestTimingMiddleware);'));
if (timingMiddlewareIndex === -1) throw new Error("requestTimingMiddleware not found");

kept.splice(timingMiddlewareIndex + 1, 0,
  "",
  "registerApiRoutes(app, routeCtx);",
);

const mobileIndex = kept.findIndex((line) => line.includes("registerMobileApiRoutes(app"));
if (mobileIndex !== -1) {
  kept[mobileIndex] = "registerMobileApiRoutes(app, { requireAuth: routeCtx.middleware.requireAuth });";
}
const messagingIndex = kept.findIndex((line) => line.includes("registerMessagingRoutes(app"));
if (messagingIndex !== -1) {
  kept[messagingIndex] = "registerMessagingRoutes(app, routeCtx.middleware);";
}

fs.writeFileSync(serverPath, kept.join("\n"));
console.log(`Slimmed server.ts: ${lines.length} -> ${kept.length} lines`);
