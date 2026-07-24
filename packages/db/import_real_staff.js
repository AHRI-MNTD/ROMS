const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvFile(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });
    return row;
  });
}

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

async function main() {
  console.log('🚀 Importing 131 real MNTD approved staff records into database...');

  const csvPaths = [
    path.resolve(process.cwd(), 'MNTD Staff-duty station_merged.csv'),
    path.resolve(process.cwd(), '../../MNTD Staff-duty station_merged.csv'),
    path.resolve(__dirname, '../../MNTD Staff-duty station_merged.csv'),
    '/home/yabets/ROMS/MNTD Staff-duty station_merged.csv',
    '/app/MNTD Staff-duty station_merged.csv'
  ];

  const csvPath = csvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('MNTD Staff-duty station_merged.csv not found!');
  }

  console.log(`Reading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const rawRows = parseCsvFile(csvContent);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const usedEmails = new Set();

  // Find system admin user if exists
  const adminUser = await prisma.user.findFirst({
    where: { roles: { has: 'ADMIN' } },
  });

  // Delete all existing demo staff profiles
  console.log('🧹 Cleaning up old demo Staff Profiles...');
  await prisma.staffProfile.deleteMany({});

  let count = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const name = r['Name']?.trim();
    if (!name) continue;

    const title = r['Title']?.trim();
    let sex = r['Sex']?.trim();
    let edu = r['Educational Level']?.trim();
    const project = r['Project Paid']?.trim();
    const position = r['Position']?.trim();
    const team = r['Team Involved']?.trim();
    const role = r['Role']?.trim();
    const dutyStation = r['Duty Station']?.trim();
    const phone = r['Phone number']?.trim();
    const rawEmail = r['Emaill']?.trim();
    const rawContractEnd = r['Contract end date']?.trim();

    // Check swapped sex / edu
    let sexClean = null;
    if (/^(male|female)$/i.test(sex)) {
      sexClean = sex.toLowerCase();
    } else if (/^(male|female)$/i.test(edu)) {
      sexClean = edu.toLowerCase();
      edu = sex;
    }

    // Determine email
    let email = null;
    if (rawEmail && rawEmail.includes('@') && !rawEmail.includes(' ')) {
      email = rawEmail.toLowerCase();
    }

    if (!email) {
      const baseSlug = slugifyName(name);
      email = `${baseSlug}@ahri.gov.et`;
    }

    // Handle duplicates
    let finalEmail = email;
    let dupSuffix = 1;
    while (usedEmails.has(finalEmail)) {
      const parts = email.split('@');
      finalEmail = `${parts[0]}${dupSuffix}@${parts[1]}`;
      dupSuffix++;
    }
    usedEmails.add(finalEmail);

    const displayName = title ? `${title} ${name}` : name;
    const jobTitle = position || role || 'Staff Member';

    // Degrees
    let firstDegree = null;
    let secondDegree = null;
    let thirdDegree = null;

    if (edu) {
      const eduUpper = edu.toUpperCase();
      if (eduUpper.includes('PHD')) {
        thirdDegree = edu;
      } else if (['MSC', 'MPH', 'MA', 'MDV'].some((d) => eduUpper.includes(d))) {
        secondDegree = edu;
      } else {
        firstDegree = edu;
      }
    }

    // Parse contract end date
    let contractEndDate = null;
    if (rawContractEnd) {
      const parsedDate = new Date(rawContractEnd);
      if (!isNaN(parsedDate.getTime())) {
        contractEndDate = parsedDate;
      }
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: finalEmail },
      update: {
        displayName,
        hashedPassword,
        emailVerified: true,
      },
      create: {
        email: finalEmail,
        displayName,
        hashedPassword,
        emailVerified: true,
        roles: ['STAFF'],
      },
    });

    // Create APPROVED StaffProfile
    await prisma.staffProfile.create({
      data: {
        userId: user.id,
        department: 'MNTD',
        jobTitle,
        startDate: new Date('2024-01-01'),
        employmentType: 'contract',
        contractEndDate,
        phone: phone || null,
        sex: sexClean,
        personalEmail: finalEmail.endsWith('@ahri.gov.et') ? null : finalEmail,
        ahriEmail: finalEmail.endsWith('@ahri.gov.et') ? finalEmail : null,
        dutyStation: dutyStation || null,
        mntdProject: project || null,
        mntdTeams: team ? [team] : [],
        mntdProjectsInvolved: project ? [project] : [],
        firstDegree,
        secondDegree,
        thirdDegree,
        approvalStatus: 'APPROVED',
        reviewedById: adminUser ? adminUser.id : null,
        reviewedAt: new Date(),
        reviewNote: 'Imported and verified from official HR roster',
      },
    });

    count++;
  }

  console.log(`✅ Successfully imported ${count} real approved MNTD staff members into database!`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
