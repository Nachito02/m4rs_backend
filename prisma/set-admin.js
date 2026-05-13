/**
 * Uso: node prisma/set-admin.js email@ejemplo.com
 * Promueve a ADMIN al usuario con ese email.
 * Para revocar: node prisma/set-admin.js email@ejemplo.com --revoke
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email  = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Uso: node prisma/set-admin.js <email> [--revoke]");
  process.exit(1);
}

const role = revoke ? "CUSTOMER" : "ADMIN";

const user = await prisma.user.update({
  where: { email },
  data:  { role },
  select: { id: true, email: true, firstName: true, lastName: true, role: true },
}).catch(() => null);

if (!user) {
  console.error(`❌  No se encontró un usuario con email: ${email}`);
  process.exit(1);
}

console.log(`✅  ${user.firstName} ${user.lastName} (${user.email}) → ${user.role}`);
await prisma.$disconnect();
