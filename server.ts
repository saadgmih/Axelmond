import { startAxelmondServer } from "./src/server/start-server";
import { logDb } from "./src/server/route-deps";

startAxelmondServer().catch((err) => {
  logDb("ERROR", "Server startup failed", { error: String(err) });
  process.exit(1);
});
