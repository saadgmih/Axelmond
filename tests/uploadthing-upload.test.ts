import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("uploadthing-upload", () => {
const clientSource = readFileSync("src/uploadthing-client.ts", "utf-8");
const serverSource = readApiRouteSources();
const appSource = readAppSources();
const supportSource = readFileSync("src/components/SupportTicketForm.tsx", "utf-8");
const uploadthingSource = readFileSync("src/uploadthing.ts", "utf-8");

assert.match(clientSource, /uploadthingApiUrl/);
assert.match(clientSource, /genUploader<OurFileRouter>\(\{\s*url:\s*uploadthingApiUrl\s*\}\)/);
assert.match(clientSource, /getUploadedFileUrl/);
assert.match(clientSource, /serverData\?\.url/);
assert.match(clientSource, /ufsUrl/);
assert.match(clientSource, /getUploadErrorMessage/);

assert.match(serverSource, /isDev:\s*isUploadThingDevMode/);
assert.match(serverSource, /logLevel:\s*process\.env\.LOG_LEVEL === "debug" \? "Debug" : "Info"/);

const uploadRateLimitIndex = serverSource.indexOf('app.use("/api/uploadthing", uploadRateLimiter)');
const uploadHandlerIndex = serverSource.indexOf('createRouteHandler({');
const globalRateLimitIndex = serverSource.indexOf('app.use("/api", globalRateLimiter)');
assert.ok(uploadRateLimitIndex > 0, "uploadRateLimiter must be registered");
assert.ok(uploadHandlerIndex > uploadRateLimitIndex, "UploadThing handler must mount after uploadRateLimiter");
assert.ok(uploadHandlerIndex > globalRateLimitIndex, "UploadThing handler must mount after globalRateLimiter");
assert.ok(!serverSource.slice(0, globalRateLimitIndex).includes("createRouteHandler({"), "UploadThing handler must not mount before rate limiters");

assert.match(serverSource, /app\.use\("\/api\/me\/avatar",\s*uploadRateLimiter\)/);

assert.match(uploadthingSource, /getFileUrl\(file\)/);
assert.match(uploadthingSource, /file\.ufsUrl \|\| file\.url \|\| file\.appUrl/);
assert.match(uploadthingSource, /prisma\.course\.findFirst/);
assert.match(uploadthingSource, /createdById:\s*user\.id/);
assert.match(uploadthingSource, /sectionId:\s*z\.string\(\)\.min\(1\)\.optional\(\)\.nullable\(\)/);
assert.match(uploadthingSource, /Lesson asset upload denied/);

assert.match(uploadthingSource, /messageAttachment:\s*f\(/);
assert.doesNotMatch(uploadthingSource, /blob:\s*\{\s*maxFileSize/);
assert.match(uploadthingSource, /image:\s*\{\s*maxFileSize:\s*["']2MB["'],\s*maxFileCount:\s*1\s*\}/);
assert.match(uploadthingSource, /isAllowedRasterImageUpload\(file\.name, file\.type/);
assert.match(uploadthingSource, /isAllowedAvatarUrl\(fileUrl\)/);
assert.match(uploadthingSource, /isAllowedRasterImageMime/);
assert.match(uploadthingSource, /isAllowedRasterImageUpload/);
assert.match(uploadthingSource, /from "\.\/avatar-security"/);
assert.doesNotMatch(uploadthingSource, /mime\.startsWith\("image\/"\)/);

assert.match(clientSource, /isAllowedRasterImageUpload/);
assert.match(clientSource, /from "\.\/avatar-security"/);

assert.match(supportSource, /RASTER_IMAGE_ACCEPT/);
assert.match(uploadthingSource, /isAllowedRasterImageUpload/);
assert.match(uploadthingSource, /from "\.\/avatar-security"/);
assert.doesNotMatch(uploadthingSource, /mime\.startsWith\("image\/"\)/);

assert.match(clientSource, /isAllowedRasterImageUpload/);
assert.match(clientSource, /from "\.\/avatar-security"/);
assert.doesNotMatch(clientSource, /file\.type\.startsWith\("image\/"\)/);

assert.match(supportSource, /RASTER_IMAGE_ACCEPT/);

assert.match(appSource, /getUploadedFileUrl/);
assert.match(appSource, /getUploadErrorMessage/);
assert.match(appSource, /validateUploadFile/);

assert.match(supportSource, /getUploadedFileUrl/);
assert.match(supportSource, /getUploadErrorMessage/);

console.log("UploadThing upload rules passed");
});
