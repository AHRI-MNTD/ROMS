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
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

interface InventoryMasterCsvRow {
  category: string;
  unit: string;
  project?: string;
  staff?: string;
}

interface CurrentInventoryCsvRow {
  codeNo: string;
  itemDescription: string;
  category: string | undefined;
  unit: string | undefined;
  checkInTotal: number;
  checkOutTotal: number;
  balance: number;
  percentBalance: number;
}

interface CheckInCsvRow {
  codeNo: string;
  barcode: string | undefined;
  itemDescription: string;
  quantity: number;
  unit: string | undefined;
  unitDescription: string | undefined;
  category: string | undefined;
  project: string | undefined;
  dateReceived: string | undefined;
  expiryDate: string | undefined;
  remark: string | undefined;
}

interface CheckOutCsvRow {
  codeNo: string;
  barcode: string | undefined;
  itemDescription: string;
  quantity: number;
  unit: string | undefined;
  unitDescription: string | undefined;
  category: string | undefined;
  dateRequested: string | undefined;
  requestedBy: string | undefined;
  projectFor: string | undefined;
  remark: string | undefined;
}

interface SeededStockItem {
  sku: string;
  name: string;
  lotNumber?: string;
  expiryDate?: Date;
  quantity: number;
  minThreshold: number;
  unit: string;
  createdAt: Date;
}

interface SeededStockMovement {
  sku: string;
  movementType: "CHECK_IN" | "CHECK_OUT";
  quantity: number;
  destination?: string;
  recipient?: string;
  requestedBy?: string;
  projectFor?: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  remark?: string;
  occurredAt: Date;
}

interface SeededStockMovementRecord extends SeededStockMovement {
  stockItemId: string;
}

interface SeededCurrentInventoryStockItem {
  sku: string;
  sourceCode: string;
  name: string;
  category?: string;
  lotNumber?: string;
  expiryDate?: Date;
  quantity: number;
  minThreshold: number;
  checkInTotal: number;
  checkOutTotal: number;
  balancePercent: number;
  unit: string;
  createdAt: Date;
}

function parseInventoryMasterCsv(csvText: string): InventoryMasterCsvRow[] {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const rows: InventoryMasterCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split(",").map((v) => v.trim());
    const [category = "", unit = "", project = "", staff = ""] = cells;

    if (!category && !unit && !project && !staff) {
      continue;
    }

    rows.push({
      category,
      unit,
      project: project || undefined,
      staff: staff || undefined,
    });
  }

  return rows;
}

function readInventoryMasterCsv(): InventoryMasterCsvRow[] {
  const candidatePaths = [
    path.resolve(process.cwd(), "BOMS_Inventory_Master_Data.csv"),
    path.resolve(process.cwd(), "../../BOMS_Inventory_Master_Data.csv"),
  ];

  const csvPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error("BOMS_Inventory_Master_Data.csv was not found. Expected at repository root.");
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  return parseInventoryMasterCsv(csvContent);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvFile(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });
}

function parseNumber(value: string | undefined): number {
  const normalized = String(value ?? "").trim();
  const numericMatch = normalized.match(/-?[\d,.]+/);
  const parsed = Number((numericMatch?.[0] ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsvDate(value: string | undefined): Date | undefined {
  const normalized = String(value ?? "").trim();
  if (!normalized || /^na$/i.test(normalized)) {
    return undefined;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function readCurrentInventoryCsv(): CurrentInventoryCsvRow[] {
  const candidatePaths = [
    path.resolve(process.cwd(), "MNTD Inventory Management 2026 - Current Inventory.csv"),
    path.resolve(process.cwd(), "../../MNTD Inventory Management 2026 - Current Inventory.csv"),
  ];

  const csvPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error("MNTD Inventory Management 2026 - Current Inventory.csv was not found. Expected at repository root.");
  }

  const rows = parseCsvFile(fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, ""))
    .map((row) => {
      const codeNo = row["Code_No"]?.trim() ?? "";
      const itemDescription = row["Item_Description"]?.trim() ?? "";
      if (!codeNo || !itemDescription) {
        return null;
      }

      return {
        codeNo,
        itemDescription,
        category: row["Category"]?.trim() || undefined,
        unit: row["Unit"]?.trim() || undefined,
        checkInTotal: parseNumber(row["Check-in total"]),
        checkOutTotal: parseNumber(row["Check-out total"]),
        balance: parseNumber(row["Balance"]),
        percentBalance: parseNumber(String(row["% Balance"] ?? "").replace(/%/g, "")),
      };
    })
    .filter((row): row is CurrentInventoryCsvRow => row !== null);

  return rows;
}

function readCheckInCsv(): CheckInCsvRow[] {
  const candidatePaths = [
    path.resolve(process.cwd(), "MNTD Inventory Management 2026 - Check-in.csv"),
    path.resolve(process.cwd(), "../../MNTD Inventory Management 2026 - Check-in.csv"),
  ];

  const csvPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error("MNTD Inventory Management 2026 - Check-in.csv was not found. Expected at repository root.");
  }

  const rows = parseCsvFile(fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, ""));
  const filtered = rows
    .map((row) => {
      const codeNo = row["Code_No"]?.trim() ?? "";
      const itemDescription = row["Item_Description"]?.trim() ?? "";
      if (!codeNo || !itemDescription) {
        return null;
      }

      return {
        codeNo,
        barcode: row["Barcode"]?.trim() || undefined,
        itemDescription,
        quantity: parseNumber(row["Quantity"]),
        unit: row["Unit"]?.trim() || undefined,
        unitDescription: row["Unit_Description"]?.trim() || undefined,
        category: row["Category"]?.trim() || undefined,
        project: row["Project"]?.trim() || undefined,
        dateReceived: row["Date_Received"]?.trim() || undefined,
        expiryDate: row["Expiry_Date"]?.trim() || undefined,
        remark: row["Remark"]?.trim() || undefined,
      } as CheckInCsvRow;
    })
    .filter((row): row is CheckInCsvRow => row !== null);

  return filtered;
}

function readCheckOutCsv(): CheckOutCsvRow[] {
  const candidatePaths = [
    path.resolve(process.cwd(), "MNTD Inventory Management 2026 - Check-out.csv"),
    path.resolve(process.cwd(), "../../MNTD Inventory Management 2026 - Check-out.csv"),
  ];

  const csvPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error("MNTD Inventory Management 2026 - Check-out.csv was not found. Expected at repository root.");
  }

  const rows = parseCsvFile(fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, ""));
  const filtered = rows
    .map((row) => {
      const codeNo = row["Code_No"]?.trim() ?? "";
      const itemDescription = row["Item_Description"]?.trim() ?? "";
      if (!codeNo || !itemDescription) {
        return null;
      }

      return {
        codeNo,
        barcode: row["Barcode"]?.trim() || undefined,
        itemDescription,
        quantity: parseNumber(row["Quantity"]),
        unit: row["Unit"]?.trim() || undefined,
        unitDescription: row["Unit_Description"]?.trim() || undefined,
        category: row["Category"]?.trim() || undefined,
        dateRequested: row["Date_Requested"]?.trim() || undefined,
        requestedBy: row["Requested_By"]?.trim() || undefined,
        projectFor: row["Project_For"]?.trim() || undefined,
        remark: row["Remark"]?.trim() || undefined,
      } as CheckOutCsvRow;
    })
    .filter((row): row is CheckOutCsvRow => row !== null);

  return filtered;
}

function humanizeInventoryLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildSeededStockItems(masterRows: InventoryMasterCsvRow[]): SeededStockItem[] {
  return masterRows.map((row, index) => {
    const seedText = `${row.category}|${row.unit}|${row.project ?? ""}|${row.staff ?? ""}`;
    const hash = hashSeed(seedText);
    const quantityBand = hash % 10;
    const quantity = quantityBand === 0 ? 0 : quantityBand <= 2 ? (hash % 20) + 1 : quantityBand <= 5 ? (hash % 80) + 10 : (hash % 400) + 50;
    const minThreshold = Math.max(3, Math.round(quantity * 0.2));
    const createdAt = new Date(Date.UTC(2025, index % 12, (index % 28) + 1));
    const expiryDate = /chemical|reagent|kit|slide|tube|tip/i.test(row.category)
      ? new Date(Date.UTC(2026 + (hash % 3), hash % 12, ((hash >> 5) % 28) + 1))
      : undefined;

    return {
      sku: row.category.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase() || `ITEM-${index + 1}`,
      name: humanizeInventoryLabel(row.category),
      lotNumber: row.project ? row.project.toUpperCase() : undefined,
      expiryDate,
      quantity,
      minThreshold,
      unit: row.unit,
      createdAt,
    };
  });
}

function buildSeededStockMovements(stockItems: SeededStockItem[], masterRows: InventoryMasterCsvRow[]): SeededStockMovement[] {
  return stockItems.flatMap((item, index) => {
    const master = masterRows[index];
    const seedText = `${item.sku}|${item.quantity}|${item.minThreshold}|${master?.project ?? ""}|${master?.staff ?? ""}`;
    const hash = hashSeed(seedText);
    const checkOutTotal = item.quantity === 0 ? (hash % 12) + 1 : Math.max(0, Math.floor(item.quantity * ((hash % 35) + 10) / 100));
    const checkInTotal = item.quantity + checkOutTotal;
    const requestedBy = master?.staff ?? "Seeded Inventory Clerk";
    const projectFor = master?.project ?? "ROMS Inventory";

    return [
      {
        sku: item.sku,
        movementType: "CHECK_IN",
        quantity: checkInTotal,
        requestedBy,
        projectFor,
        status: "APPROVED",
        remark: item.lotNumber ? `Opening stock for lot ${item.lotNumber}` : "Opening stock",
        occurredAt: new Date(Date.UTC(2025, index % 12, (index % 28) + 1, 8, 0, 0)),
      },
      {
        sku: item.sku,
        movementType: "CHECK_OUT",
        quantity: checkOutTotal,
        destination: projectFor,
        recipient: master?.staff ?? undefined,
        requestedBy,
        projectFor,
        status: item.quantity === 0 ? "PENDING" : "APPROVED",
        remark: checkOutTotal > 0 ? "Seeded consumption history" : "No historical checkout",
        occurredAt: new Date(Date.UTC(2025, index % 12, (index % 28) + 1, 15, 30, 0)),
      },
    ];
  });
}

function normalizeInventoryKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildCurrentInventorySeedRows(rows: CurrentInventoryCsvRow[]): SeededCurrentInventoryStockItem[] {
  const codeUsage = new Map<string, number>();

  return rows.map((row, index) => {
    const usage = (codeUsage.get(row.codeNo) ?? 0) + 1;
    codeUsage.set(row.codeNo, usage);
    const sku = usage === 1 ? row.codeNo : `${row.codeNo}-${usage}`;
    const quantity = Math.max(0, Math.floor(row.balance));
    const checkInTotal = Math.max(0, Math.floor(row.checkInTotal));
    const checkOutTotal = Math.max(0, Math.floor(row.checkOutTotal));
    const minThreshold = quantity <= 0 ? 1 : Math.max(1, Math.ceil(quantity * 0.2));

    return {
      sku,
      sourceCode: row.codeNo,
      name: row.itemDescription,
      category: row.category,
      quantity,
      minThreshold,
      checkInTotal,
      checkOutTotal,
      balancePercent: row.percentBalance,
      unit: row.unit ?? "units",
      createdAt: new Date(Date.UTC(2026, index % 12, (index % 28) + 1)),
    };
  });
}

function buildAdditionalCurrentInventorySeedRows(
  currentInventoryRows: CurrentInventoryCsvRow[],
  checkInRows: CheckInCsvRow[],
  existingKeys: Set<string>,
): SeededCurrentInventoryStockItem[] {
  const additionalRows: SeededCurrentInventoryStockItem[] = [];

  for (const row of checkInRows) {
    const key = normalizeInventoryKey(`${row.codeNo}|${row.itemDescription}`);
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    additionalRows.push({
      sku: row.codeNo,
      sourceCode: row.codeNo,
      name: row.itemDescription,
      category: row.category,
      lotNumber: row.project,
      expiryDate: parseCsvDate(row.expiryDate),
      quantity: Math.max(0, Math.floor(row.quantity)),
      minThreshold: Math.max(1, Math.ceil(Math.max(0, Math.floor(row.quantity)) * 0.2)),
      checkInTotal: Math.max(0, Math.floor(row.quantity)),
      checkOutTotal: 0,
      balancePercent: Math.max(0, Math.min(100, Math.round(row.quantity > 0 ? 100 : 0))),
      unit: row.unit ?? "units",
      createdAt: new Date(Date.UTC(2026, additionalRows.length % 12, (additionalRows.length % 28) + 1)),
    });
  }

  return additionalRows;
}

function buildMovementSeedRows(
  stockItems: Array<{ sku: string; sourceCode: string; name: string; category?: string; unit: string }>,
  checkInRows: CheckInCsvRow[],
  checkOutRows: CheckOutCsvRow[],
): SeededStockMovementRecord[] {
  const stockKeyMap = new Map<string, string>();
  stockItems.forEach((item) => {
    stockKeyMap.set(normalizeInventoryKey(`${item.sourceCode}|${item.name}`), item.sku);
    stockKeyMap.set(normalizeInventoryKey(item.sourceCode), item.sku);
  });

  const movements: Array<Omit<SeededStockMovementRecord, "stockItemId"> & { stockItemId?: string }> = [];

  checkInRows.forEach((row, index) => {
    const stockItemId = stockKeyMap.get(normalizeInventoryKey(`${row.codeNo}|${row.itemDescription}`)) ?? stockKeyMap.get(normalizeInventoryKey(row.codeNo));
    if (!stockItemId) {
      return;
    }

    movements.push({
      stockItemId,
      sku: row.codeNo,
      movementType: "CHECK_IN",
      quantity: Math.max(0, Math.floor(row.quantity)),
      destination: row.project ?? undefined,
      recipient: undefined,
      requestedBy: row.project ?? undefined,
      projectFor: row.project ?? undefined,
      status: "APPROVED",
      remark: row.remark ?? "Imported from check-in CSV",
      occurredAt: parseCsvDate(row.dateReceived) ?? new Date(Date.UTC(2026, index % 12, (index % 28) + 1, 8, 0, 0)),
    });
  });

  checkOutRows.forEach((row, index) => {
    const stockItemId = stockKeyMap.get(normalizeInventoryKey(`${row.codeNo}|${row.itemDescription}`)) ?? stockKeyMap.get(normalizeInventoryKey(row.codeNo));
    if (!stockItemId) {
      return;
    }

    movements.push({
      stockItemId,
      sku: row.codeNo,
      movementType: "CHECK_OUT",
      quantity: Math.max(0, Math.floor(row.quantity)),
      destination: row.projectFor ?? undefined,
      recipient: row.requestedBy ?? undefined,
      requestedBy: row.requestedBy ?? undefined,
      projectFor: row.projectFor ?? undefined,
      status: "APPROVED",
      remark: row.remark ?? "Imported from check-out CSV",
      occurredAt: parseCsvDate(row.dateRequested) ?? new Date(Date.UTC(2026, index % 12, (index % 28) + 1, 15, 30, 0)),
    });
  });

  return movements.filter((movement): movement is SeededStockMovementRecord => typeof movement.stockItemId === "string");
}

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

  // ─── Inventory master data (CSV) ─────────────────────────────────────────
  const masterRows = readInventoryMasterCsv();
  const inventoryMasterData = prisma as PrismaClient & {
    inventoryMasterData: {
      deleteMany: () => Promise<unknown>;
      createMany: (args: { data: InventoryMasterCsvRow[] }) => Promise<unknown>;
    };
  };

  await inventoryMasterData.inventoryMasterData.deleteMany();
  if (masterRows.length > 0) {
    await inventoryMasterData.inventoryMasterData.createMany({
      data: masterRows,
    });
  }
  console.log(`✅ Imported ${masterRows.length} inventory master-data rows from CSV`);

  const currentInventoryRows = readCurrentInventoryCsv();
  const checkInRows = readCheckInCsv();
  const checkOutRows = readCheckOutCsv();
  const currentInventoryItems = buildCurrentInventorySeedRows(currentInventoryRows);
  const currentInventoryKeySet = new Set(currentInventoryRows.map((row) => normalizeInventoryKey(`${row.codeNo}|${row.itemDescription}`)));
  const extraInventoryItems = buildAdditionalCurrentInventorySeedRows(currentInventoryRows, checkInRows, currentInventoryKeySet);
  const stockItems = [...currentInventoryItems, ...extraInventoryItems];

  const stockPrisma = prisma as PrismaClient & {
    stockItem: {
      deleteMany: () => Promise<unknown>;
      createMany: (args: {
        data: SeededCurrentInventoryStockItem[];
      }) => Promise<unknown>;
      findMany: (args?: Record<string, unknown>) => Promise<Array<{ id: string; sku: string; sourceCode: string | null; name: string; category: string | null }>>;
    };
  };

  await stockPrisma.stockItem.deleteMany();
  if (stockItems.length > 0) {
    await stockPrisma.stockItem.createMany({
      data: stockItems,
      skipDuplicates: true,
    });
  }
  console.log(`✅ Seeded ${stockItems.length} current inventory stock items from CSV`);

  const seededStockRecords: Array<{ id: string; sku: string; sourceCode: string | null; name: string; category: string | null }> = await stockPrisma.stockItem.findMany({
    where: {
      OR: stockItems.map((item) => ({
        sku: item.sku,
      })),
    },
    select: { id: true, sku: true, sourceCode: true, name: true, category: true },
  });
  const stockIdBySku = new Map(seededStockRecords.map((row) => [row.sku, row.id] as [string, string]));
  const stockIdBySourceCode = new Map(seededStockRecords.filter((row) => row.sourceCode).map((row) => [row.sourceCode as string, row.id] as [string, string]));
  const seededMovements = buildMovementSeedRows(
    seededStockRecords.map((row) => ({
      sku: row.sku,
      sourceCode: row.sourceCode ?? row.sku,
      name: row.name,
      category: row.category ?? undefined,
      unit: "units",
    })),
    checkInRows,
    checkOutRows,
  )
    .map((movement) => ({
      ...movement,
      stockItemId: stockIdBySku.get(movement.sku) ?? stockIdBySourceCode.get(movement.sku),
    }))
    .filter((movement): movement is SeededStockMovementRecord => Boolean(movement.stockItemId));

  const movementPrisma = prisma as PrismaClient & {
    inventoryMovement: {
      deleteMany: () => Promise<unknown>;
      createMany: (args: { data: SeededStockMovementRecord[] }) => Promise<unknown>;
    };
  };

  if (seededMovements.length > 0) {
    await movementPrisma.inventoryMovement.createMany({
      data: seededMovements.map((movement) =>
        Object.fromEntries(
          Object.entries(movement)
            .filter(([key, value]) => key !== "sku" && value !== undefined)
        ) as SeededStockMovementRecord
      ),
    });
  }
  console.log(`✅ Seeded ${seededMovements.length} inventory movement records from CSV`);

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
    users.slice(0, 6).map((u: any, i: number) =>
      prisma.staffProfile.upsert({
        where: { userId: u.id },
        update: {
          approvalStatus: ["PENDING", "PENDING", "APPROVED", "APPROVED", "REJECTED", "REJECTED"][i] as any,
          reviewedById: i >= 2 ? users[6]?.id : null,
          reviewedAt: i >= 2 ? new Date("2025-05-01T10:00:00") : null,
          reviewNote:
            i >= 4
              ? "Employee did not meet the approval criteria yet."
              : i >= 2
                ? "Employee approved for HR access."
                : null,
        } as any,
        create: {
          userId: u.id,
          department: [
            "Laboratory Sciences",
            "Data Management",
            "Research Administration",
            "Principal Investigators",
            "Human Resources",
            "Operations",
          ][i],
          jobTitle: [
            "Lab Scientist",
            "Data Manager",
            "Research Admin",
            "Principal Investigator",
            "HR Officer",
            "Operations Coordinator",
          ][i],
          startDate: new Date("2022-01-01"),
          approvalStatus: ["PENDING", "PENDING", "APPROVED", "APPROVED", "REJECTED", "REJECTED"][i] as any,
          reviewedById: i >= 2 ? users[6]?.id : undefined,
          reviewedAt: i >= 2 ? new Date("2025-05-01T10:00:00") : undefined,
          reviewNote:
            i >= 4
              ? "Employee did not meet the approval criteria yet."
              : i >= 2
                ? "Employee approved for HR access."
                : undefined,
        } as any,
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
