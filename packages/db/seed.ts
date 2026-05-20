/**
 * ROMS Database Seed
 * -----------------
 * - Creates one demo user per Role (password: password123)
 * - Seeds DomainCatalog, SubFunctionCatalog, TaskCatalog from HTML spec
 * - Inserts 3-5 demo records per domain
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DOMAIN_CATALOG } from "@roms/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting ROMS database seed...\n");

  // ─── Users ─────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash("password123", 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "scientist@roms.dev" },
      update: {},
      create: {
        email: "scientist@roms.dev",
        hashedPassword: password,
        displayName: "Alice Mwangi",
        roles: ["LAB_SCIENTIST"],
      },
    }),
    prisma.user.upsert({
      where: { email: "datamanager@roms.dev" },
      update: {},
      create: {
        email: "datamanager@roms.dev",
        hashedPassword: password,
        displayName: "Brian Okonkwo",
        roles: ["DATA_MANAGER"],
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@roms.dev" },
      update: {},
      create: {
        email: "admin@roms.dev",
        hashedPassword: password,
        displayName: "Carol Nzinga",
        roles: ["RESEARCH_ADMIN"],
      },
    }),
    prisma.user.upsert({
      where: { email: "pi@roms.dev" },
      update: {},
      create: {
        email: "pi@roms.dev",
        hashedPassword: password,
        displayName: "Dr. David Asante",
        roles: ["PRINCIPAL_INVESTIGATOR"],
      },
    }),
    prisma.user.upsert({
      where: { email: "qa@roms.dev" },
      update: {},
      create: {
        email: "qa@roms.dev",
        hashedPassword: password,
        displayName: "Eve Diallo",
        roles: ["QA_OFFICER"],
      },
    }),
    prisma.user.upsert({
      where: { email: "community@roms.dev" },
      update: {},
      create: {
        email: "community@roms.dev",
        hashedPassword: password,
        displayName: "Frank Mensah",
        roles: ["COMMUNITY_ENGAGEMENT"],
      },
    }),
    prisma.user.upsert({
      where: { email: "sysadmin@roms.dev" },
      update: {},
      create: {
        email: "sysadmin@roms.dev",
        hashedPassword: password,
        displayName: "Grace Abubakar",
        roles: ["ADMIN"],
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} demo users`);

  // ─── Domain Catalog ────────────────────────────────────────────────────────
  for (const domain of DOMAIN_CATALOG) {
    const dc = await prisma.domainCatalog.upsert({
      where: { slug: domain.slug },
      update: {},
      create: {
        domainId: domain.id,
        slug: domain.slug,
        emoji: domain.emoji,
        name: domain.name,
      },
    });

    for (let sfIdx = 0; sfIdx < domain.subfunctions.length; sfIdx++) {
      const sf = domain.subfunctions[sfIdx];
      const sfRecord = await prisma.subFunctionCatalog.upsert({
        where: {
          id: `${dc.id}_sf_${sfIdx}`,
        },
        update: {},
        create: {
          id: `${dc.id}_sf_${sfIdx}`,
          domainId: dc.id,
          name: sf.name,
          order: sfIdx,
        },
      });

      for (let tIdx = 0; tIdx < sf.tasks.length; tIdx++) {
        await prisma.taskCatalog.upsert({
          where: { id: `${sfRecord.id}_t_${tIdx}` },
          update: {},
          create: {
            id: `${sfRecord.id}_t_${tIdx}`,
            subfunctionId: sfRecord.id,
            text: sf.tasks[tIdx],
            order: tIdx,
          },
        });
      }
    }
  }

  console.log("✅ Seeded DomainCatalog (10 domains × 5 subfunctions × 5 tasks = 250 tasks)");

  // ─── Study ────────────────────────────────────────────────────────────────
  const study = await prisma.study.upsert({
    where: { code: "DEMO-001" },
    update: {},
    create: {
      code: "DEMO-001",
      title: "DEMO: Malaria Vaccine Efficacy Trial Phase II",
      status: "ACTIVE",
      pi: "Dr. David Asante",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2026-12-31"),
    },
  });

  const study2 = await prisma.study.upsert({
    where: { code: "DEMO-002" },
    update: {},
    create: {
      code: "DEMO-002",
      title: "DEMO: TB Cohort Longitudinal Study",
      status: "ACTIVE",
      pi: "Dr. David Asante",
      startDate: new Date("2023-06-01"),
      endDate: new Date("2027-05-31"),
    },
  });

  console.log("✅ Created demo studies");

  // ─── Participants ─────────────────────────────────────────────────────────
  const participants = await Promise.all([
    prisma.participant.upsert({
      where: { pseudonymId: "DEMO-001-P001" },
      update: {},
      create: {
        pseudonymId: "DEMO-001-P001",
        studyId: study.id,
        status: "ACTIVE",
        enrolledAt: new Date("2024-02-01"),
      },
    }),
    prisma.participant.upsert({
      where: { pseudonymId: "DEMO-001-P002" },
      update: {},
      create: {
        pseudonymId: "DEMO-001-P002",
        studyId: study.id,
        status: "ACTIVE",
        enrolledAt: new Date("2024-02-15"),
      },
    }),
    prisma.participant.upsert({
      where: { pseudonymId: "DEMO-001-P003" },
      update: {},
      create: {
        pseudonymId: "DEMO-001-P003",
        studyId: study.id,
        status: "SCREENED",
      },
    }),
  ]);

  console.log(`✅ Created ${participants.length} demo participants`);

  // ─── Storage locations ────────────────────────────────────────────────────
  const storageLocA = await prisma.storageLocation.upsert({
    where: { id: "storage-A1" },
    update: {},
    create: {
      id: "storage-A1",
      freezer: "Freezer-1",
      rack: "Rack-A",
      box: "Box-01",
      position: "A1",
      tempCelsius: -80,
    },
  });

  // ─── Samples ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.sample.upsert({
      where: { accessionId: "ACC-2024-001" },
      update: {},
      create: {
        accessionId: "ACC-2024-001",
        participantId: participants[0].id,
        collectedAt: new Date("2024-02-01"),
        status: "STORED",
        storageLocationId: storageLocA.id,
        studyCode: study.code,
        notes: "Whole blood — plasma aliquots",
      },
    }),
    prisma.sample.upsert({
      where: { accessionId: "ACC-2024-002" },
      update: {},
      create: {
        accessionId: "ACC-2024-002",
        participantId: participants[1].id,
        collectedAt: new Date("2024-02-15"),
        status: "IN_PROCESSING",
        studyCode: study.code,
      },
    }),
    prisma.sample.upsert({
      where: { accessionId: "ACC-2024-003" },
      update: {},
      create: {
        accessionId: "ACC-2024-003",
        participantId: participants[0].id,
        collectedAt: new Date("2024-03-01"),
        status: "STORED",
        storageLocationId: storageLocA.id,
        studyCode: study.code,
      },
    }),
  ]);

  console.log("✅ Created demo samples");

  // ─── Equipment & Stock ────────────────────────────────────────────────────
  const equipment = await prisma.equipment.upsert({
    where: { serial: "CENTRIFUGE-001" },
    update: {},
    create: {
      serial: "CENTRIFUGE-001",
      model: "Eppendorf 5810R",
      manufacturer: "Eppendorf",
      location: "Lab 3B",
      purchaseDate: new Date("2022-01-15"),
      lastCalibratedAt: new Date("2024-01-10"),
      status: "ACTIVE",
    },
  });

  await prisma.equipment.upsert({
    where: { serial: "PCR-CYCLER-001" },
    update: {},
    create: {
      serial: "PCR-CYCLER-001",
      model: "Bio-Rad CFX96",
      manufacturer: "Bio-Rad",
      location: "Lab 2A",
      purchaseDate: new Date("2021-06-20"),
      status: "ACTIVE",
    },
  });

  await Promise.all([
    prisma.stockItem.upsert({
      where: { sku: "PIPETTE-200" },
      update: {},
      create: {
        sku: "PIPETTE-200",
        name: "Micropipette Tips 200µL",
        quantity: 1000,
        minThreshold: 200,
        unit: "tips",
        expiryDate: new Date("2025-12-31"),
      },
    }),
    prisma.stockItem.upsert({
      where: { sku: "TUBE-EPPENDORF-1.5" },
      update: {},
      create: {
        sku: "TUBE-EPPENDORF-1.5",
        name: "Eppendorf Tubes 1.5mL",
        quantity: 30,
        minThreshold: 50,
        unit: "tubes",
      },
    }),
  ]);

  console.log("✅ Created demo equipment and stock items");

  // ─── SOPs ─────────────────────────────────────────────────────────────────
  const sop1 = await prisma.sOP.upsert({
    where: { code: "SOP-BIO-001" },
    update: {},
    create: {
      code: "SOP-BIO-001",
      title: "Blood Sample Collection and Processing",
      version: "2.1",
      status: "APPROVED",
      ownerId: users[4].id, // QA Officer
    },
  });

  const sop2 = await prisma.sOP.upsert({
    where: { code: "SOP-LAB-001" },
    update: {},
    create: {
      code: "SOP-LAB-001",
      title: "ELISA Assay Protocol — Malaria Antigen Detection",
      version: "1.3",
      status: "APPROVED",
      ownerId: users[4].id,
    },
  });

  // ─── CAPA ─────────────────────────────────────────────────────────────────
  await prisma.cAPA.create({
    data: {
      finding: "Temperature excursion detected in Freezer-1 on 2024-03-15: +4°C above threshold for 2 hours",
      ownerId: users[4].id,
      dueDate: new Date("2024-04-30"),
      status: "IN_PROGRESS",
      sopId: sop1.id,
    },
  });

  console.log("✅ Created demo SOPs and CAPA");

  // ─── Grants ───────────────────────────────────────────────────────────────
  const grant = await prisma.grant.upsert({
    where: { code: "GRANT-NIH-2024-001" },
    update: {},
    create: {
      code: "GRANT-NIH-2024-001",
      title: "NIH R01 — Malaria Vaccine Immunogenicity",
      funder: "National Institutes of Health",
      awardedAmount: 2500000,
      currency: "USD",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2028-12-31"),
      status: "ACTIVE",
      studyId: study.id,
    },
  });

  await prisma.budget.createMany({
    data: [
      { grantId: grant.id, category: "Personnel", planned: 1200000, spent: 180000 },
      { grantId: grant.id, category: "Supplies & Reagents", planned: 400000, spent: 62000 },
      { grantId: grant.id, category: "Equipment", planned: 300000, spent: 290000 },
      { grantId: grant.id, category: "Travel", planned: 100000, spent: 14000 },
      { grantId: grant.id, category: "Indirect Costs (40%)", planned: 500000, spent: 75000 },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Created demo grants and budgets");

  // ─── Ethics submission ────────────────────────────────────────────────────
  await prisma.ethicsSubmission.create({
    data: {
      studyId: study.id,
      committee: "University of Nairobi Research Ethics Committee",
      status: "APPROVED",
      submittedAt: new Date("2023-10-01"),
      decidedAt: new Date("2023-12-15"),
    },
  });

  // ─── Sensor readings ─────────────────────────────────────────────────────
  const now = new Date();
  await prisma.sensorReading.createMany({
    data: Array.from({ length: 5 }).map((_, i) => ({
      sensorId: "SENSOR-FREEZER-1",
      value: -79.5 + (Math.random() - 0.5),
      unit: "celsius",
      recordedAt: new Date(now.getTime() - i * 60000),
      kind: "temperature",
    })),
    skipDuplicates: true,
  });

  console.log("✅ Created demo sensor readings");

  // ─── Protocols & Assay Runs ───────────────────────────────────────────────
  const protocol = await prisma.protocol.upsert({
    where: { code: "PROTO-ELISA-001" },
    update: {},
    create: {
      code: "PROTO-ELISA-001",
      title: "Malaria Antigen ELISA — Primary Endpoint",
      version: "1.0",
      studyCode: study.code,
    },
  });

  await prisma.assayRun.create({
    data: {
      protocolId: protocol.id,
      status: "COMPLETED",
      startedAt: new Date("2024-03-10T08:00:00"),
      completedAt: new Date("2024-03-10T14:30:00"),
      operatorId: users[0].id,
    },
  });

  console.log("✅ Created demo protocols and assay runs");

  // ─── Staff profiles ───────────────────────────────────────────────────────
  await Promise.all(
    users.slice(0, 4).map((u, i) =>
      prisma.staffProfile.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          userId: u.id,
          department: ["Laboratory Sciences", "Data Management", "Research Administration", "Principal Investigators"][i],
          jobTitle: ["Lab Scientist", "Data Manager", "Research Admin", "Principal Investigator"][i],
          startDate: new Date("2022-01-01"),
        },
      })
    )
  );

  console.log("✅ Created demo staff profiles");

  // ─── Print credentials ────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ROMS Demo Credentials (password: password123)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const rows = [
    ["scientist@roms.dev", "LAB_SCIENTIST", "Alice Mwangi"],
    ["datamanager@roms.dev", "DATA_MANAGER", "Brian Okonkwo"],
    ["admin@roms.dev", "RESEARCH_ADMIN", "Carol Nzinga"],
    ["pi@roms.dev", "PRINCIPAL_INVESTIGATOR", "Dr. David Asante"],
    ["qa@roms.dev", "QA_OFFICER", "Eve Diallo"],
    ["community@roms.dev", "COMMUNITY_ENGAGEMENT", "Frank Mensah"],
    ["sysadmin@roms.dev", "ADMIN", "Grace Abubakar"],
  ];
  rows.forEach(([email, role, name]) => {
    console.log(`  ${name.padEnd(28)} ${email.padEnd(30)} [${role}]`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
