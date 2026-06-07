const isProductionClient = Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);

if (isProductionClient) {
  const noop = () => undefined;

  for (const method of ["log", "debug", "info", "warn", "error", "trace", "dir", "table", "group", "groupCollapsed", "groupEnd"] as const) {
    try {
      Object.defineProperty(console, method, { value: noop, writable: false, configurable: false });
    } catch {
      (console as unknown as Record<string, () => void>)[method] = noop;
    }
  }

  document.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "f12") {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey && event.shiftKey && ["i", "j", "c", "k"].includes(key)) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey && key === "u") {
      event.preventDefault();
    }
  });
}
