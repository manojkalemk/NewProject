import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on("error", (err) => {
  console.error("Unexpected PG client error", err);
  process.exit(-1);
});

export default pool;