/**
 * ROMS — System Admin Setup Script
 * ─────────────────────────────────────────────────────────────────────────────
 * This script performs two actions:
 *
 *  1. Creates (or updates) the dedicated system-admin account:
 *       Email    : systemadmin@roms.com
 *       Password : (strong, set below — change after first run if desired)
 *       Roles    : ['ADMIN']
 *       Perms    : ['admin:all']
 *
 *  2. Demotes gfikerak@yahoo.com from ADMIN → regular STAFF user so it
 *     receives only the access rights assigned to it by a system admin.
 *
 * Run with:
 *   node packages/db/setup_system_admin.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Admin credentials ─────────────────────────────────────────────────────
const ADMIN_EMAIL       = 'systemadmin@roms.com';
const ADMIN_DISPLAY     = 'ROMS System Administrator';
// Strong password: min 16 chars, upper+lower+digit+symbol
const ADMIN_PASSWORD    = 'R0ms@Sys#2026!Sec';

// ─── Personal account to demote ────────────────────────────────────────────
const PERSONAL_EMAIL    = 'gfikerak@yahoo.com';
const PERSONAL_DISPLAY  = 'Fikregabriel Abera';

// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  ROMS — System Admin Account Setup');
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── STEP 1: Create / update systemadmin@roms.com ──────────────────────────
  console.log(`📋  Step 1: Provisioning dedicated admin account → ${ADMIN_EMAIL}`);

  const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 12); // cost=12 for extra hardening

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      displayName:    ADMIN_DISPLAY,
      hashedPassword: hashedAdminPassword,
      roles:          ['ADMIN'],
      permissions:    ['admin:all'],
      emailVerified:  true,
      verificationCode: null,
    },
    create: {
      email:          ADMIN_EMAIL,
      displayName:    ADMIN_DISPLAY,
      hashedPassword: hashedAdminPassword,
      roles:          ['ADMIN'],
      permissions:    ['admin:all'],
      emailVerified:  true,
    },
  });

  console.log(`  ✅  Admin account ready.`);
  console.log(`      ID      : ${adminUser.id}`);
  console.log(`      Email   : ${adminUser.email}`);
  console.log(`      Roles   : ${JSON.stringify(adminUser.roles)}`);
  console.log(`      Perms   : ${JSON.stringify(adminUser.permissions)}\n`);

  // ── STEP 2: Demote gfikerak@yahoo.com to regular STAFF ────────────────────
  console.log(`📋  Step 2: Demoting personal account → ${PERSONAL_EMAIL} to STAFF`);

  const personalUser = await prisma.user.findUnique({
    where: { email: PERSONAL_EMAIL },
  });

  if (!personalUser) {
    console.log(`  ⚠️   ${PERSONAL_EMAIL} not found in database — nothing to demote.\n`);
  } else {
    const demoted = await prisma.user.update({
      where: { email: PERSONAL_EMAIL },
      data: {
        displayName: PERSONAL_DISPLAY,
        roles:       ['STAFF'],   // Regular user — admin assigns rights as needed
        permissions: [],          // No custom permissions
      },
    });
    console.log(`  ✅  Personal account demoted to STAFF.`);
    console.log(`      ID      : ${demoted.id}`);
    console.log(`      Email   : ${demoted.email}`);
    console.log(`      Roles   : ${JSON.stringify(demoted.roles)}`);
    console.log(`      Perms   : ${JSON.stringify(demoted.permissions)}\n`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Setup Complete — Summary');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  System Admin  : ${ADMIN_EMAIL}`);
  console.log(`  Password      : ${ADMIN_PASSWORD}`);
  console.log(`  Personal Acct : ${PERSONAL_EMAIL}  →  Role: STAFF`);
  console.log('\n  ⚠️   IMPORTANT: Store the admin password securely and do not');
  console.log('      leave it in this script in production environments.\n');
}

main()
  .catch((err) => {
    console.error('\n❌  Setup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
