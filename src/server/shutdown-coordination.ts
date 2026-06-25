import type { NextFunction, Request, Response } from "express";
import { startupLifecycle } from "./startup-lifecycle";

let activeHttpRequests = 0;

export function getActiveHttpRequestCount(): number {
  return activeHttpRequests;
}

export function shutdownGuardMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (startupLifecycle.isShuttingDown) {
    res
      .status(503)
      .setHeader("Connection", "close")
      .json({
        error: "Le service redémarre. Réessayez dans quelques secondes.",
        code: "SERVICE_SHUTTING_DOWN",
      });
    return;
  }

  activeHttpRequests += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeHttpRequests -= 1;
  };
  res.once("finish", release);
  res.once("close", release);
  next();
}

export async function waitForActiveHttpRequests(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (activeHttpRequests > 0 && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  return activeHttpRequests === 0;
}

/** @internal Test helper */
export function resetActiveHttpRequestsForTests(): void {
  activeHttpRequests = 0;
}
