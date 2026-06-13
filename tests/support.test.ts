import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");
const supportViewSource = fs.readFileSync("src/components/SupportView.tsx", "utf8");
const reportViewSource = fs.readFileSync("src/components/ReportProblemView.tsx", "utf8");
const ticketFormSource = fs.readFileSync("src/components/SupportTicketForm.tsx", "utf8");
const switchSource = fs.readFileSync("src/views/InstitutionalViewSwitch.tsx", "utf8");

assert.match(serverSource, /const supportTicketSchema = z\.object\(\{/);
assert.match(
  serverSource,
  /app\.post\("\/api\/support\/tickets",\s*requireAuth,\s*validateBody\(supportTicketSchema\),\s*async\s*\(req,\s*res\)/
);
assert.match(uploadthingSource, /supportScreenshot:\s*f\(/);
assert.match(apiSource, /createSupportTicket:/);
assert.match(apiSource, /request<any>\("POST",\s*["']\/api\/support\/tickets["'],\s*data\)/);

assert.match(switchSource, /currentView === "support"/);
assert.match(switchSource, /currentView === "report-problem"/);
assert.match(switchSource, /ReportProblemView/);

assert.match(supportViewSource, /Centre d&apos;aide/);
assert.match(supportViewSource, /Rechercher une question/);
assert.match(supportViewSource, /navigateTo\("report-problem"\)/);
assert.doesNotMatch(supportViewSource, /createSupportTicket/);

assert.match(reportViewSource, /Signaler un problème/);
assert.match(reportViewSource, /SupportTicketForm/);
assert.doesNotMatch(reportViewSource, /Base de connaissances/);

assert.match(ticketFormSource, /api\.createSupportTicket\(\{/);
assert.match(ticketFormSource, /supportScreenshot/);

assert.match(appSource, /navigateTo\("report-problem"\)/);

console.log("Support center redesign tests passed successfully!");
