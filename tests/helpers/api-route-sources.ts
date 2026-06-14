import fs from "node:fs";
import path from "node:path";

/** Concatenate server bootstrap + modular API route modules for static analysis tests. */
export function readServerBootstrapSources(): string {
  const root = process.cwd();
  return [
    fs.readFileSync(path.join(root, "server.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "server", "create-app.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "server", "start-server.ts"), "utf8"),
  ].join("\n");
}

/** Concatenate server bootstrap + modular API route modules for static analysis tests. */
export function readApiRouteSources(): string {
  const root = process.cwd();
  const routesDir = path.join(root, "src", "routes");
  const routeFiles = fs
    .readdirSync(routesDir)
    .filter((name) => name.endsWith("-routes.ts"))
    .sort()
    .map((name) => fs.readFileSync(path.join(routesDir, name), "utf8"));

  const authDir = path.join(routesDir, "auth");
  const authRouteFiles = fs.existsSync(authDir)
    ? fs
        .readdirSync(authDir)
        .filter((name) => name.endsWith(".ts"))
        .sort()
        .map((name) => fs.readFileSync(path.join(authDir, name), "utf8"))
    : [];

  return [
    ...readServerBootstrapSources().split("\n"),
    fs.readFileSync(path.join(root, "src", "server", "startup-db.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "routes", "register-api-routes.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "server", "route-deps.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "server", "route-mappers.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "server", "route-schemas.ts"), "utf8"),
    fs.readFileSync(path.join(root, "src", "auth-session.ts"), "utf8"),
    ...routeFiles,
    ...authRouteFiles,
  ].join("\n");
}
