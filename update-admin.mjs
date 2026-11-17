import { run, get } from './server/db.js';
import { hashPassword } from './server/services/auth.js';

const adminHash = hashPassword('admin123456789');
const nemaHash = hashPassword('NEMA#2026');

run("UPDATE accounts SET password_hash = ?, role = 'nema', display_name = 'NEMA National Command Centre' WHERE username = 'nema.admin'", nemaHash);

const admin = get("SELECT id FROM accounts WHERE username = 'admin'");
if (!admin) {
  run(
    "INSERT INTO accounts (username, password_hash, role, display_name, status, created_at) VALUES ('admin', ?, 'nema', 'Super Admin Central Backend', 'active', datetime('now'))",
    adminHash
  );
} else {
  run("UPDATE accounts SET password_hash = ?, role = 'nema', display_name = 'Super Admin Central Backend' WHERE username = 'admin'", adminHash);
}

console.log('ACCOUNTS UPDATED SUCCESSFULLY: superadmin (admin/admin123456789), nema (nema.admin/NEMA#2026)');
