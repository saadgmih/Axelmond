import pg from "pg";

const url = process.env.DATABASE_URL;
console.log("Testing connection from:", process.pid, "to URL:", url?.replace(/:[^:@]+@/, ":***@"));

const pool = new pg.Pool({
  connectionString: url,
  max: 2,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const t0 = Date.now();
  console.log("Connecting...");
  const client = await pool.connect();
  const t1 = Date.now();
  console.log(`Connected in ${t1 - t0}ms!`);
  const res = await client.query('SELECT current_database(), current_schema()');
  console.log("Query result in", Date.now() - t1, "ms:", res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
