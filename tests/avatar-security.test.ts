import assert from "node:assert/strict";
import {
  isAllowedAvatarMime,
  isAllowedAvatarUrl,
  isAllowedRasterImageMime,
  isAllowedRasterImageUpload,
  isForbiddenRasterImageExtension,
  sanitizeAvatarUrl,
} from "../src/avatar-security.ts";

assert.equal(isAllowedAvatarUrl("https://utfs.io/f/avatar.jpg"), true);
assert.equal(isAllowedAvatarUrl("https://ufs.sh/f/avatar.webp"), true);
assert.equal(isAllowedAvatarUrl("https://uploadthing.com/f/abc"), true);
assert.equal(isAllowedAvatarUrl("https://cdn.utfs.io/f/avatar.png"), true);

assert.equal(isAllowedAvatarUrl("https://evil.com/avatar.jpg"), false);
assert.equal(isAllowedAvatarUrl("http://utfs.io/avatar.jpg"), false);
assert.equal(isAllowedAvatarUrl("data:image/png;base64,iVBORw0KGgo="), false);
assert.equal(isAllowedAvatarUrl("javascript:alert(1)"), false);

assert.equal(isAllowedAvatarMime("image/jpeg"), true);
assert.equal(isAllowedAvatarMime("image/png"), true);
assert.equal(isAllowedAvatarMime("image/webp"), true);

assert.equal(isAllowedAvatarMime("image/svg+xml"), false);
assert.equal(isAllowedAvatarMime("image/gif"), false);
assert.equal(isAllowedAvatarMime("application/pdf"), false);
assert.equal(isAllowedAvatarMime(null), false);

assert.equal(isAllowedRasterImageMime("image/jpeg"), true);
assert.equal(isAllowedRasterImageMime("image/svg+xml"), false);

assert.equal(isForbiddenRasterImageExtension("logo.svg"), true);
assert.equal(isForbiddenRasterImageExtension("logo.SVGZ"), true);
assert.equal(isForbiddenRasterImageExtension("photo.jpg"), false);

assert.equal(isAllowedRasterImageUpload("photo.jpg", "image/jpeg"), true);
assert.equal(isAllowedRasterImageUpload("logo.svg", "image/svg+xml"), false);
assert.equal(isAllowedRasterImageUpload("evil.jpg", "image/svg+xml"), false);
assert.equal(isAllowedRasterImageUpload("photo.svg", "image/jpeg"), false);

assert.equal(sanitizeAvatarUrl("  https://utfs.io/f/avatar.jpg  "), "https://utfs.io/f/avatar.jpg");
assert.equal(sanitizeAvatarUrl("https://evil.com/avatar.jpg"), null);
assert.equal(sanitizeAvatarUrl(""), null);
assert.equal(sanitizeAvatarUrl(null), null);

console.log("Avatar security tests passed");
