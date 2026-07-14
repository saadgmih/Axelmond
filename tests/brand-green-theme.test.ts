import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

const readPngInfo = (filePath: string) => {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    colorType: buffer[25],
    height: buffer.readUInt32BE(20),
    size: buffer.length,
    width: buffer.readUInt32BE(16),
  };
};

const sha256 = (filePath: string) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

rulesTest("brand-green-theme", () => {
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  assert.match(cssSource, /--pa-brand-500:\s*#05c2a5/i);
  assert.match(cssSource, /--color-indigo-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-violet-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-pink-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-blue-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-cyan-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--pa-emerald-500:\s*#10b981/i);
  assert.match(cssSource, /--pa-jade-500:\s*#0fbf95/i);
  assert.match(cssSource, /--pa-mint-500:\s*#22c55e/i);
  assert.match(cssSource, /--pa-neutral-950:\s*#031512/i);
  assert.match(cssSource, /--color-slate-900:\s*var\(--pa-neutral-900\)/);
  assert.match(cssSource, /--color-gray-900:\s*var\(--pa-neutral-900\)/);
  assert.match(cssSource, /--color-zinc-900:\s*var\(--pa-neutral-900\)/);
  assert.match(cssSource, /--color-neutral-900:\s*var\(--pa-neutral-900\)/);
  assert.match(cssSource, /--color-stone-900:\s*var\(--pa-neutral-900\)/);
  assert.match(cssSource, /--color-red-500:\s*var\(--pa-emerald-500\)/);
  assert.match(cssSource, /--color-rose-500:\s*var\(--pa-emerald-500\)/);
  assert.match(cssSource, /--color-orange-500:\s*var\(--pa-jade-500\)/);
  assert.match(cssSource, /--color-amber-500:\s*var\(--pa-mint-500\)/);
  assert.match(cssSource, /--color-yellow-500:\s*var\(--pa-mint-500\)/);
  assert.match(cssSource, /--color-fuchsia-500:\s*var\(--pa-jade-500\)/);
  assert.doesNotMatch(
    cssSource,
    /rgba\(139, 92, 246|rgba\(99, 102, 241|rgba\(236, 72, 153|rgba\(168, 85, 247|#818cf8|#a5b4fc|#fde047|#fbbf24|#0f172a|#020617|#1e293b/i,
  );

  const emailSource = fs.readFileSync("src/email.ts", "utf8");
  assert.match(emailSource, /#05C2A5/);
  assert.match(emailSource, /performance-logo-e6657b8a\.png/);
  assert.doesNotMatch(emailSource, /performance-logo-symbol\.png/);
  assert.doesNotMatch(emailSource, /#8b5cf6|#ec4899|#6366f1|#4c1d95|#9d174d|#93c5fd|#ef4444|#7f1d1d|#fca5a5/i);

  const manifestSource = fs.readFileSync("public/manifest.json", "utf8");
  const indexHtml = fs.readFileSync("index.html", "utf8");
  assert.match(indexHtml, /background:\s*#031512/i);
  assert.match(indexHtml, /theme-color" content="#031512"/i);
  assert.doesNotMatch(indexHtml, /#111827/i);
  assert.match(manifestSource, /"theme_color":\s*"#05C2A5"/);
  assert.match(manifestSource, /"background_color":\s*"#042f29"/);
  assert.match(manifestSource, /performance-logo-e6657b8a\.png/);
  assert.match(manifestSource, /"sizes":\s*"1024x1024"/);
  assert.doesNotMatch(manifestSource, /performance-logo-symbol\.png/);

  const legalDocumentsSource = fs.readFileSync("src/data/legalDocuments.ts", "utf8");
  assert.doesNotMatch(
    legalDocumentsSource,
    /colorClass: ".*\b(indigo|violet|purple|pink|rose|sky|blue|cyan|red|orange|amber|yellow)-/,
  );

  const logoSvg = fs.readFileSync("public/logo-symbol.svg", "utf8");
  const faviconSvg = fs.readFileSync("public/favicon.svg", "utf8");
  assert.match(logoSvg, /data:image\/png;base64/);
  assert.match(faviconSvg, /data:image\/png;base64/);
  assert.doesNotMatch(logoSvg, /#0ea5e9/i);
  assert.doesNotMatch(faviconSvg, /#0ea5e9/i);

  const canonicalLogoHash = sha256("public/performance-logo-e6657b8a.png");
  for (const logoPath of [
    "public/performance-logo-e6657b8a.png",
    "public/performance-logo-3d-symbol.png",
    "public/performance-logo-3d.png",
    "public/performance-logo-symbol.png",
    "public/performance-logo.png",
    "public/logo-symbol.png",
    "public/logo.png",
    "public/performance-logo-3d-full.png",
    "public/performance-logo-full.png",
    "public/logo-full.png",
  ]) {
    const logo = readPngInfo(logoPath);
    assert.equal(logo.width, 1024);
    assert.equal(logo.height, 1024);
    assert.equal(logo.colorType, 6);
    assert.ok(logo.size > 1_500_000, `${logoPath} should contain the provided 3D logo`);
    assert.equal(sha256(logoPath), canonicalLogoHash, `${logoPath} should reuse the provided logo without resizing`);
  }
});
