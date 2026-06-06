import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");
const supportViewSource = fs.readFileSync("src/components/SupportView.tsx", "utf8");

// 1. Check support ticket validation schema in server.ts
assert.match(serverSource, /const supportTicketSchema = z\.object\(\{/);
assert.match(serverSource, /subject: z\.string\(\)/);
assert.match(serverSource, /category: z\.string\(\)/);
assert.match(serverSource, /description: z\.string\(\)/);
assert.match(serverSource, /screenshotUrl: z\.string\(\)/);

// 2. Check Express route POST /api/support/tickets in server.ts with requireAuth and validateBody
assert.match(
  serverSource, 
  /app\.post\("\/api\/support\/tickets",\s*requireAuth,\s*validateBody\(supportTicketSchema\),\s*async\s*\(req,\s*res\)/
);

// 3. Check audit log registration inside POST /api/support/tickets
assert.match(serverSource, /"SUPPORT_TICKET_CREATED"/);
assert.match(serverSource, /logAudit\(/);

// 4. Check supportScreenshot upload router route in src/uploadthing.ts
assert.match(uploadthingSource, /supportScreenshot:\s*f\(/);
assert.match(uploadthingSource, /image:\s*\{\s*maxFileSize:\s*["']4MB["'],\s*maxFileCount:\s*1\s*\}/);

// 5. Check createSupportTicket API helper in src/api.ts
assert.match(apiSource, /createSupportTicket:\s*\(data:\s*\{\s*subject:\s*string;\s*category:\s*string;\s*description:\s*string;\s*screenshotUrl\??:\s*string\s*\|\s*null\s*\}\)/);
assert.match(apiSource, /request<any>\("POST",\s*["']\/api\/support\/tickets["'],\s*data\)/);

// 6. Check SupportView integration via InstitutionalViewSwitch inside App.tsx
assert.match(appSource, /InstitutionalViewSwitch/);
assert.match(appSource, /INSTITUTIONAL_VIEWS\.has\(currentView\)/);

// 7. Check that SupportView renders the search input, categories, live status, and upload block
assert.match(supportViewSource, /import\s*\{\s*api\s*\}\s*from\s*"\.\.\/api";/);
assert.match(supportViewSource, /api\.createSupportTicket\(\{/);
assert.match(supportViewSource, /Support Opérationnel/); // Support status
assert.match(supportViewSource, /Rechercher une question/); // Search bar placeholder/title
assert.match(supportViewSource, /supportScreenshot/); // UploadThing endpoint

console.log("Support center redesign tests passed successfully!");
