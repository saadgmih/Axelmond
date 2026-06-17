import fs from "node:fs";
import path from "node:path";

function readSourceFilesRecursive(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return readSourceFilesRecursive(filePath);
      return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [filePath] : [];
    });
}

/** Concatenate App entrypoint + modular platform shell for static analysis tests. */
export function readAppSources(): string {
  const root = process.cwd();
  const parts = [path.join(root, "src/App.tsx"), path.join(root, "src/lazyViews.tsx")];

  const appDir = path.join(root, "src/app");
  const appFiles = [
    "platform-app-types.ts",
    "platform-app-context.tsx",
    "platform-app-slices.tsx",
    "catalogIcons.tsx",
    "usePlatformApp.ts",
    "PlatformAppRoot.tsx",
    "AuthenticatedPlatformLayout.tsx",
    "StudentRouteSwitch.tsx",
    "TeacherRouteSwitch.tsx",
    "AppFooter.tsx",
  ];

  for (const name of appFiles) {
    const filePath = path.join(appDir, name);
    if (fs.existsSync(filePath)) parts.push(filePath);
  }

  for (const filePath of readSourceFilesRecursive(appDir)) {
    if (!parts.includes(filePath)) {
      parts.push(filePath);
    }
  }

  return parts.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");
}
