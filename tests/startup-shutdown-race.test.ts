import assert from "node:assert/strict";
import fs from "node:fs";

import { drainDatabaseForShutdown, StartupLifecycle } from "../src/server/startup-lifecycle.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

rulesTest("startup-shutdown-race", async () => {
  const lifecycle = new StartupLifecycle();
  const queryStarted = deferred();
  const releaseQueries = deferred();
  const events: string[] = [];
  const errors: string[] = [];
  const unhandledRejections: unknown[] = [];
  let poolEnded = false;

  const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
  process.on("unhandledRejection", onUnhandledRejection);

  try {
    const query = async () => {
      if (poolEnded) {
        const message = "Cannot use a pool after calling end on the pool";
        errors.push(message);
        throw new Error(message);
      }
      events.push("query");
    };

    const inFlightQuery = lifecycle.trackCriticalTask(
      (async () => {
        queryStarted.resolve();
        await releaseQueries.promise;
        await query();
      })(),
    );
    const cancellableQuery = lifecycle.trackCriticalTask(
      (async () => {
        await releaseQueries.promise;
        if (lifecycle.signal.aborted) return;
        await query();
      })(),
    );

    await queryStarted.promise;
    lifecycle.beginShutdown("SIGTERM");
    const shutdown = drainDatabaseForShutdown({
      lifecycle,
      timeoutMs: 250,
      stopDatabaseTasks: async () => {
        events.push("maintenance-stopped");
      },
      disconnectDatabase: async () => {
        events.push("disconnect");
        poolEnded = true;
      },
    });

    assert.equal(lifecycle.isShuttingDown, true);
    assert.equal(lifecycle.signalName, "SIGTERM");
    releaseQueries.resolve();

    assert.equal(await shutdown, true);
    await Promise.all([inFlightQuery, cancellableQuery]);
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.equal(events.filter((event) => event === "query").length, 1);
    assert.ok(events.indexOf("query") < events.indexOf("disconnect"));
    assert.ok(events.indexOf("maintenance-stopped") < events.indexOf("disconnect"));
    assert.deepEqual(errors, []);
    assert.deepEqual(unhandledRejections, []);

    const timeoutLifecycle = new StartupLifecycle();
    timeoutLifecycle.beginShutdown("SIGTERM");
    const releaseTimedOutTask = deferred();
    let disconnectedAfterTimeout = false;
    const timedOutTask = timeoutLifecycle.trackCriticalTask(releaseTimedOutTask.promise);
    const drained = await drainDatabaseForShutdown({
      lifecycle: timeoutLifecycle,
      timeoutMs: 10,
      stopDatabaseTasks: async () => undefined,
      disconnectDatabase: async () => {
        disconnectedAfterTimeout = true;
      },
    });

    assert.equal(drained, false);
    assert.equal(disconnectedAfterTimeout, false);
    releaseTimedOutTask.resolve();
    await timedOutTask;
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
  }

  const startServer = fs.readFileSync("src/server/start-server.ts", "utf8");
  const createApp = fs.readFileSync("src/server/create-app.ts", "utf8");
  const refreshCleanup = fs.readFileSync("src/auth-token-cleanup.ts", "utf8");
  const auditCleanup = fs.readFileSync("src/audit-log-service.ts", "utf8");
  const database = fs.readFileSync("src/db.ts", "utf8");

  assert.match(startServer, /startupLifecycle\.trackCriticalTask/);
  assert.match(startServer, /waitForActiveHttpRequests/);
  assert.match(startServer, /drainDatabaseForShutdown/);
  assert.match(createApp, /shutdownGuardMiddleware/);
  assert.match(createApp, /isDatabaseDisconnected/);
  assert.match(startServer, /stopAuditLogRetention\(\)/);
  assert.match(startServer, /stopRefreshTokenCleanup\(\)/);
  assert.match(startServer, /isExpectedShutdownCancellation/);
  assert.doesNotMatch(startServer, /void runDeferredStartupTasks/);
  assert.match(refreshCleanup, /activePurge/);
  assert.match(auditCleanup, /activePurge/);
  assert.match(database, /trackTask\?:/);
  assert.match(startServer, /verifyDatabaseConnection\(\{[\s\S]*trackTask:/);
});
