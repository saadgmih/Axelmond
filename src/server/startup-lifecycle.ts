export class StartupShutdownCancellationError extends Error {
  constructor(message = "Startup task cancelled during shutdown") {
    super(message);
    this.name = "StartupShutdownCancellationError";
  }
}

export class StartupLifecycle {
  private readonly controller = new AbortController();
  private readonly criticalTasks = new Set<Promise<unknown>>();
  private shutdownSignal: string | null = null;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isShuttingDown(): boolean {
    return this.controller.signal.aborted;
  }

  get signalName(): string | null {
    return this.shutdownSignal;
  }

  beginShutdown(signal: string): boolean {
    if (this.isShuttingDown) return false;
    this.shutdownSignal = signal;
    this.controller.abort(new StartupShutdownCancellationError(`Startup cancelled by ${signal}`));
    return true;
  }

  trackCriticalTask<T>(task: Promise<T>): Promise<T> {
    const tracked = task.finally(() => {
      this.criticalTasks.delete(tracked);
    });
    this.criticalTasks.add(tracked);
    return tracked;
  }

  async waitForCriticalTasks(): Promise<void> {
    while (this.criticalTasks.size > 0) {
      await Promise.allSettled([...this.criticalTasks]);
    }
  }
}

export const startupLifecycle = new StartupLifecycle();

export function isExpectedShutdownCancellation(reason: unknown, lifecycle = startupLifecycle): boolean {
  if (reason instanceof StartupShutdownCancellationError) return true;
  return lifecycle.isShuttingDown && reason instanceof Error && reason.name === "AbortError";
}

export async function drainDatabaseForShutdown(options: {
  lifecycle: StartupLifecycle;
  timeoutMs: number;
  stopDatabaseTasks: () => Promise<void>;
  disconnectDatabase: () => Promise<void>;
}): Promise<boolean> {
  const { lifecycle, timeoutMs, stopDatabaseTasks, disconnectDatabase } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const drained = await Promise.race([
    Promise.all([lifecycle.waitForCriticalTasks(), stopDatabaseTasks()]).then(() => true),
    new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
      timer.unref?.();
    }),
  ]);
  if (timer) clearTimeout(timer);
  if (!drained) return false;

  await disconnectDatabase();
  return true;
}
