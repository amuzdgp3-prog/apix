/**
 * Сброс паролей всех пользователей на "admin123".
 * Запуск: cd apps/server; npx tsx scripts/reset-passwords.ts
 */
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "../src/config.js";

const pool = new Pool({ connectionString: config.DATABASE_URL });

async function main() {
  const users = await pool.query("SELECT id, email FROM staff ORDER BY id");
  const password = "admin123";

  for (const u of users.rows) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE staff SET password = $1 WHERE id = $2", [hash, u.id]);
    console.log(`OK: ${u.email} (id=${u.id})`);
  }

  // Verify
  const check = await pool.query(
    "SELECT id, email FROM staff WHERE id = 2",
  );
  const row = check.rows[0];
  const stored = await pool.query("SELECT password FROM staff WHERE id = 2");
  const valid = await bcrypt.compare(password, stored.rows[0].password);
  console.log(`\nVerification: ${row.email} — ${valid ? "VALID" : "INVALID"}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});