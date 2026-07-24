const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Setting Fikregabriel Abera (gfikerak@yahoo.com) as System Admin and removing Grace Abubakar...');

  // 1. Remove Grace Abubakar (email sysadmin@roms.dev or displayName containing Grace Abubakar)
  const grace = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'sysadmin@roms.dev' },
        { displayName: { contains: 'Grace Abubakar', mode: 'insensitive' } }
      ]
    }
  });

  if (grace) {
    console.log(`Deleting Grace Abubakar user record (ID: ${grace.id}, Email: ${grace.email})...`);
    await prisma.user.delete({ where: { id: grace.id } });
    console.log('✅ Grace Abubakar removed.');
  } else {
    console.log('Grace Abubakar user record not found.');
  }

  // 2. Create or update Fikregabriel Abera (gfikerak@yahoo.com) as ADMIN
  const password = await bcrypt.hash('password123', 10);
  const fikre = await prisma.user.upsert({
    where: { email: 'gfikerak@yahoo.com' },
    update: {
      displayName: 'Fikregabriel Abera',
      roles: ['ADMIN'],
      permissions: ['admin:all'],
      hashedPassword: password,
      emailVerified: true,
    },
    create: {
      email: 'gfikerak@yahoo.com',
      displayName: 'Fikregabriel Abera',
      roles: ['ADMIN'],
      permissions: ['admin:all'],
      hashedPassword: password,
      emailVerified: true,
    },
  });

  console.log('✅ Fikregabriel Abera is now System Admin!');
  console.log(`User ID: ${fikre.id}, Email: ${fikre.email}, Roles: ${JSON.stringify(fikre.roles)}`);
}

main()
  .catch((e) => {
    console.error('Error updating system admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
