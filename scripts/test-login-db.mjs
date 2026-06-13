import dotenv from "dotenv";
import pg from "pg";

dotenv.config();
const { Pool } = pg;

async function testSchema(label, schemaParam, searchPath) {
  const base = process.env.DATABASE_URL.replace(/schema=[^&]+/, `schema=${schemaParam}`);
  const pool = new Pool({ connectionString: base });
  try {
    await pool.query(`SET search_path TO "${searchPath}"`);
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "User"`);
    console.log(`${label}: OK users=${r.rows[0].c}`);
  } catch (err) {
    console.log(`${label}: FAIL ${err.message}`);
  } finally {
    await pool.end();
  }
}

await testSchema("schema=AxelmondResearchLab", "AxelmondResearchLab", "AxelmondResearchLab");
await testSchema("schema=unicode (old URL)", "unicode", "unicode");

try {
  const res = await fetch("https://axelmond.com/api/health");
  const body = await res.json();
  console.log("Production health:", res.status, JSON.stringify(body));
} catch (err) {
  console.log("Production health fetch failed:", err.message);
}
