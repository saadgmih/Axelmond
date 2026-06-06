import fs from "fs";

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes('schemas  = ["unicode"]')) {
  schema = schema.replace(
    /datasource db \{\n  provider = "postgresql"\n  url      = env\("DATABASE_URL"\)\n\}/,
    'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n  schemas  = ["unicode"]\n}',
  );
}

const lines = schema.split("\n");
const out = [];
let inBlock = false;
let blockHasSchema = false;

for (const line of lines) {
  const trimmed = line.trim();
  if (/^(enum|model)\s+\w+/.test(trimmed)) {
    inBlock = true;
    blockHasSchema = false;
  }
  if (inBlock && trimmed === '@@schema("unicode")') {
    blockHasSchema = true;
  }
  if (inBlock && trimmed === "}" && !line.startsWith("  ")) {
    if (!blockHasSchema) {
      out.push('  @@schema("unicode")');
    }
    inBlock = false;
  }
  out.push(line);
}

fs.writeFileSync(schemaPath, out.join("\n"));
console.log("prisma/schema.prisma patched with @@schema(\"unicode\")");
