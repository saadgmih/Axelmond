import type { Page } from "@playwright/test";
import { redactSecrets } from "./prod-auth.ts";

export type HttpIssue = { status: number; url: string; method: string };

export class ProdRunMetrics {
  readonly steps: string[] = [];
  readonly consoleErrors: string[] = [];
  readonly pageErrors: string[] = [];
  readonly httpIssues: HttpIssue[] = [];
  startedAt = Date.now();

  attach(page: Page, label: string) {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.consoleErrors.push(`[${label}] ${redactSecrets(msg.text())}`);
      }
    });
    page.on("pageerror", (err) => {
      this.pageErrors.push(`[${label}] ${redactSecrets(err.message)}`);
    });
    page.on("response", (response) => {
      const status = response.status();
      if (status >= 400) {
        const url = response.url();
        if (!url.includes("/api/")) return;
        if (status === 403 && url.includes("/grades")) return;
        this.httpIssues.push({
          status,
          url: redactSecrets(url),
          method: response.request().method(),
        });
      }
    });
  }

  step(message: string) {
    this.steps.push(message);
    console.log(`   ${message}`);
  }

  summary() {
    const durationMs = Date.now() - this.startedAt;
    const status4xx = this.httpIssues.filter((h) => h.status >= 400 && h.status < 500);
    const status5xx = this.httpIssues.filter((h) => h.status >= 500);
    return {
      durationMs,
      durationLabel: `${(durationMs / 1000).toFixed(1)}s`,
      steps: [...this.steps],
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
      http4xx: status4xx,
      http5xx: status5xx,
    };
  }
}
