import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const contactViewSource = fs.readFileSync("src/components/ContactView.tsx", "utf8");

// 1. Check contact validation schema in server.ts
assert.match(serverSource, /const contactSchema = z\.object\(\{/);
assert.match(serverSource, /name: z\.string\(\)/);
assert.match(serverSource, /email: z\.string\(\)/);
assert.match(serverSource, /subject: z\.string\(\)/);
assert.match(serverSource, /category: z\.string\(\)/);
assert.match(serverSource, /message: z\.string\(\)/);

// 2. Check Express route POST /api/contact in server.ts with requireAuth and validateBody
assert.match(
  serverSource, 
  /app\.post\("\/api\/contact",\s*requireAuth,\s*validateBody\(contactSchema\),\s*async\s*\(req,\s*res\)/
);

// 3. Check audit log registration inside POST /api/contact
assert.match(serverSource, /"CONTACT_SUBMISSION"/);
assert.match(serverSource, /logAudit\(/);

// 4. Check submitContact API helper in src/api.ts
assert.match(apiSource, /submitContact:\s*\(data:\s*\{\s*name:\s*string;\s*email:\s*string;\s*subject:\s*string;\s*category:\s*string;\s*message:\s*string\s*\}\)/);
assert.match(apiSource, /request<any>\("POST",\s*["']\/api\/contact["'],\s*data\)/);

// 5. Check ContactView integration via InstitutionalViewSwitch inside App.tsx
assert.match(appSource, /InstitutionalViewSwitch/);
assert.match(appSource, /INSTITUTIONAL_VIEWS\.has\(currentView\)/);

// 6. Check that ContactView uses API and renders the complete required elements
assert.match(contactViewSource, /import\s*\{\s*api\s*\}\s*from\s*"\.\.\/api";/);
assert.match(contactViewSource, /api\.submitContact\(\{/);
assert.match(contactViewSource, /verification@axelmond\.com/); // Required contact email
assert.match(contactViewSource, /\+212\s*634772103/); // Required telephone number
assert.match(contactViewSource, /Données Sécurisées/); // Data protection section
assert.match(contactViewSource, /loi 09-08|loi n° 09-08/i);

console.log("Contact page redesign tests passed successfully!");
