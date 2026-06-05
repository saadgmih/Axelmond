import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const clientSource = readFileSync("src/uploadthing-client.ts", "utf-8");
const serverSource = readFileSync("server.ts", "utf-8");
const appSource = readFileSync("src/App.tsx", "utf-8");
const supportSource = readFileSync("src/components/SupportView.tsx", "utf-8");
const uploadthingSource = readFileSync("src/uploadthing.ts", "utf-8");

assert.match(clientSource, /uploadthingApiUrl/);
assert.match(clientSource, /genUploader<OurFileRouter>\(\{\s*url:\s*uploadthingApiUrl\s*\}\)/);
assert.match(clientSource, /getUploadedFileUrl/);
assert.match(clientSource, /serverData\?\.url/);
assert.match(clientSource, /ufsUrl/);
assert.match(clientSource, /getUploadErrorMessage/);

assert.match(serverSource, /isDev:\s*isUploadThingDevMode/);
assert.match(serverSource, /logLevel:\s*process\.env\.LOG_LEVEL === "debug" \? "Debug" : "Info"/);

assert.match(uploadthingSource, /getFileUrl\(file\)/);
assert.match(uploadthingSource, /file\.ufsUrl \|\| file\.url \|\| file\.appUrl/);
assert.match(uploadthingSource, /prisma\.course\.findFirst/);
assert.match(uploadthingSource, /createdById:\s*user\.id/);
assert.match(uploadthingSource, /sectionId:\s*z\.string\(\)\.min\(1\)\.optional\(\)\.nullable\(\)/);
assert.match(uploadthingSource, /Lesson asset upload denied/);

assert.match(appSource, /getUploadedFileUrl/);
assert.match(appSource, /getUploadErrorMessage/);
assert.match(appSource, /validateUploadFile/);

assert.match(supportSource, /getUploadedFileUrl/);
assert.match(supportSource, /getUploadErrorMessage/);

console.log("UploadThing upload rules passed");
