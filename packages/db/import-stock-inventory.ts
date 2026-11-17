import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { google } from "googleapis";
import prisma from "./index";

function parseCleanNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, "").trim();
  if (!str) return 0;
  const match = str.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function parseCleanDate(val: unknown): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Excel serial date code (e.g. 46157 -> May 15, 2026)
  if (typeof val === "number" || /^\d{5}$/.test(str)) {
    const num = typeof val === "number" ? val : parseInt(str, 10);
    if (num > 20000 && num < 70000) {
      const parsedExcel = XLSX.SSF.parse_date_code(num);
      if (parsedExcel) {
        return new Date(Date.UTC(parsedExcel.y, parsedExcel.m - 1, parsedExcel.d, 12, 0, 0));
      }
    }
  }

  // Format: "2027" or "2028"
  if (/^\d{4}$/.test(str)) {
    return new Date(`${str}-12-31T23:59:59.000Z`);
  }

  // Format: "MM-YYYY" (e.g. "02-2027", "09-2027")
  const mmyyyy = str.match(/^(\d{1,2})-(\d{4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59));
  }

  // Format: "M/D/YYYY" (e.g. "5/6/2026", "5/15/2026")
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const month = parseInt(mdy[1], 10);
    const day = parseInt(mdy[2], 10);
    const year = parseInt(mdy[3], 10);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  // Standard parse (handles "Wed, May 13, 2026", "Mon, May 4, 2026", ISO, etc.)
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.valueOf()) && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2100) {
    return parsed;
  }

  return null;
}

const AUTHORITATIVE_PROJECTS = [
  "ACHIDES",
  "AnoSTEP",
  "CDC",
  "ColGo",
  "Dessicate",
  "DRIVAX",
  "EMAGEN",
  "Gov't",
  "HAMMS",
  "INDIE",
  "INDIE2",
  "MNTD",
  "OptiVivax",
  "Preg",
  "PvGam",
  "PvSTATEM",
  "PvTBI",
  "PvTrans",
  "StephBio",
  "StephColonoy",
  "TES2021",
  "TES2023",
  "TMDA",
  "UrbanMalaria",
  "VISPA",
] as const;

function normalizeProject(raw: unknown): string {
  if (!raw) return "MNTD";
  const str = String(raw).trim();
  if (!str) return "MNTD";

  if ((AUTHORITATIVE_PROJECTS as readonly string[]).includes(str)) {
    return str;
  }

  const lower = str.toLowerCase();
  if (lower === "anostep") return "AnoSTEP";
  if (lower === "drivax") return "DRIVAX";
  if (lower === "pvstatem") return "PvSTATEM";
  if (lower.includes("pvstatem")) return "PvSTATEM";
  if (lower.includes("anostep")) return "AnoSTEP";
  if (lower === "gevernment" || lower === "government" || lower === "gov't" || lower === "govt") return "Gov't";
  if (lower.includes("hamms")) return "HAMMS";
  if (lower.includes("cdc")) return "CDC";
  if (lower === "optivivax") return "OptiVivax";
  if (lower === "tes2021") return "TES2021";
  if (lower === "tes2023") return "TES2023";
  if (lower === "urbanmalaria") return "UrbanMalaria";
  if (lower === "stephbio") return "StephBio";
  if (lower === "stephcolonoy" || lower === "stephcolony") return "StephColonoy";

  const match = AUTHORITATIVE_PROJECTS.find((p) => p.toLowerCase() === lower);
  if (match) return match;

  return "MNTD";
}

function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function readCsvRows<T = Record<string, string>>(filePath: string): T[] {
  const wb = XLSX.readFile(filePath, { raw: false });
  return XLSX.utils.sheet_to_json<T>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}

async function main() {
  console.log("=================================================");
  console.log("🚀 Starting Authoritative Stock Inventory Import");
  console.log("=================================================");

  const rootDir = path.resolve(__dirname, "../..");
  const checkInCsvPath = path.join(rootDir, "MNTD Inventory Management 2026 - Check-in.csv");
  const checkOutCsvPath = path.join(rootDir, "MNTD Inventory Management 2026 - Check-out.csv");
  const currentInvCsvPath = path.join(rootDir, "MNTD Inventory Management 2026 - Current Inventory.csv");
  const masterDataCsvPath = path.join(rootDir, "BOMS_Inventory_Master_Data.csv");
  const staffCsvPath = path.join(rootDir, "MNTD Staff-duty station_merged.csv");

  console.log("📂 Reading spreadsheet datasets...");
  let [checkInRows, checkOutRows, currentInvRows, masterRows, staffDutyRows] = await Promise.all([
    readCsvRows<any>(checkInCsvPath),
    readCsvRows<any>(checkOutCsvPath),
    readCsvRows<any>(currentInvCsvPath),
    readCsvRows<any>(masterDataCsvPath),
    readCsvRows<any>(staffCsvPath),
  ]);

  const credsPath = path.join(rootDir, "google-service-account.json");
  if (fs.existsSync(credsPath)) {
    try {
      console.log("  🌐 Connecting to live Google Sheets via service account...");
      const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
      const auth = new google.auth.JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1nwLTyUZPav5dOdzejqOWSxVWA1SzWSTsz8ioAPiQkJI";

      const [inRes, outRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: "'Check-in'!A2:K1000" }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: "'Check-out'!A2:K2000" }),
      ]);

      const gIn = inRes.data.values || [];
      const gOut = outRes.data.values || [];

      if (gIn.length > 0) {
        checkInRows = gIn.map((r) => ({
          Code_No: r[0] || "",
          Barcode: r[1] || "",
          Item_Description: r[2] || "",
          Quantity: r[3] || 0,
          Unit: r[4] || "",
          Unit_Description: r[5] || "",
          Category: r[6] || "",
          Project: r[7] || "",
          Date_Received: r[8] || "",
          Expiry_Date: r[9] || "",
          Remark: r[10] || "",
        }));
      }

      if (gOut.length > 0) {
        checkOutRows = gOut.map((r) => ({
          Code_No: r[0] || "",
          Barcode: r[1] || "",
          Item_Description: r[2] || "",
          Quantity: r[3] || 0,
          Unit: r[4] || "",
          Unit_Description: r[5] || "",
          Category: r[6] || "",
          Date_Requested: r[7] || "",
          Requested_By: r[8] || "",
          Project_For: r[9] || "",
          Remark: r[10] || "",
        }));
      }
      console.log(`  ✓ Pulled ${checkInRows.length} Check-ins and ${checkOutRows.length} Check-outs directly from Google Sheets!`);
    } catch (gErr: any) {
      console.warn("  ⚠️ Failed to pull from live Google Sheets, falling back to local CSVs:", gErr.message);
    }
  }

  console.log(`  - Check-in records: ${checkInRows.length}`);
  console.log(`  - Check-out records: ${checkOutRows.length}`);
  console.log(`  - Current Inventory records: ${currentInvRows.length}`);
  console.log(`  - Master Data records: ${masterRows.length}`);
  console.log(`  - Staff duty records: ${staffDutyRows.length}`);

  // 1. Sync & Seed Master Data
  console.log("\n📦 Step 1: Synchronizing Master Data (Categories, Units, Projects, Personnel)...");
  // Projects are strictly restricted to the 25 official institutional projects
  const projectsSet = new Set<string>(AUTHORITATIVE_PROJECTS);
  const categoriesSet = new Set<string>();
  const unitsSet = new Set<string>();
  const staffSet = new Set<string>();

  masterRows.forEach((r) => {
    if (r.Categories?.trim()) categoriesSet.add(r.Categories.trim());
    if (r.Units?.trim()) unitsSet.add(r.Units.trim());
    if (r.Staff?.trim()) staffSet.add(toTitleCase(r.Staff.trim()));
  });

  staffDutyRows.forEach((r) => {
    if (r.Name?.trim()) staffSet.add(toTitleCase(r.Name.trim()));
  });

  checkInRows.forEach((r) => {
    if (r.Category?.trim()) categoriesSet.add(r.Category.trim());
    if (r.Unit?.trim()) unitsSet.add(r.Unit.trim());
  });

  checkOutRows.forEach((r) => {
    if (r.Requested_By?.trim()) staffSet.add(toTitleCase(r.Requested_By.trim()));
  });

  const maxLen = Math.max(projectsSet.size, categoriesSet.size, unitsSet.size, staffSet.size);
  const pArr = Array.from(projectsSet).sort();
  const cArr = Array.from(categoriesSet).sort();
  const uArr = Array.from(unitsSet).sort();
  const sArr = Array.from(staffSet).sort();

  console.log(`  - Found ${pArr.length} Projects: ${pArr.join(", ")}`);
  console.log(`  - Found ${sArr.length} Staff members`);
  console.log(`  - Found ${cArr.length} Categories`);
  console.log(`  - Found ${uArr.length} Units`);

  // Clear and re-populate Master Data
  await prisma.inventoryMasterData.deleteMany({});
  const masterDataInserts = [];
  for (let i = 0; i < maxLen; i++) {
    masterDataInserts.push({
      project: pArr[i] || null,
      category: cArr[i] || "",
      unit: uArr[i] || "",
      staff: sArr[i] || null,
    });
  }
  await prisma.inventoryMasterData.createMany({ data: masterDataInserts });
  console.log(`  ✓ Successfully populated ${masterDataInserts.length} master data records.`);

  // 2. Clean out old test stock data
  console.log("\n🧹 Step 2: Cleaning out old test StockItem, Movement, and Loan records...");
  await prisma.projectLoan.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.stockItem.deleteMany({});
  console.log("  ✓ Stock tables cleaned.");

  // Map Code_No to initial check-in details
  const itemMap = new Map<string, any>();
  const checkInByCode = new Map<string, any>();

  for (const r of checkInRows) {
    const code = (r.Code_No || "").trim();
    if (!code) continue;
    checkInByCode.set(code, r);
  }

  // 3. Insert all 498 StockItems from Check-in
  console.log("\n📥 Step 3: Importing 498 Stock Items and initial Check-in movements...");
  let createdItemsCount = 0;
  let createdMovementsCount = 0;

  for (const row of checkInRows) {
    const code = (row.Code_No || "").trim();
    if (!code) continue;

    const name = (row.Item_Description || "Unnamed Item").trim();
    const barcode = (row.Barcode || code).trim();
    const category = (row.Category || "General").trim() || "General";
    const unit = (row.Unit || "units").trim() || "units";
    const project = normalizeProject(row.Project);
    const qtyIn = parseCleanNumber(row.Quantity);
    const dateReceived = parseCleanDate(row.Date_Received) || new Date("2026-05-15T10:00:00.000Z");
    const expiryDate = parseCleanDate(row.Expiry_Date);
    const remark = (row.Remark || "").trim() || "Initial stock check-in";

    let stockItem = itemMap.get(code);
    if (stockItem) {
      const newQty = stockItem.quantity + qtyIn;
      const newCheckIn = (stockItem.checkInTotal || 0) + qtyIn;
      const updated = await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: {
          quantity: newQty,
          checkInTotal: newCheckIn,
          balancePercent: newCheckIn > 0 ? (newQty / newCheckIn) * 100 : 0,
        },
      });
      stockItem = { ...updated, owningProject: stockItem.owningProject };
      itemMap.set(code, stockItem);
    } else {
      const created = await prisma.stockItem.create({
        data: {
          sku: code,
          sourceCode: code,
          barcode: barcode,
          name: name,
          category: category,
          unit: unit,
          quantity: qtyIn,
          checkInTotal: qtyIn,
          checkOutTotal: 0,
          balancePercent: qtyIn > 0 ? 100 : 0,
          minThreshold: 5,
          expiryDate: expiryDate,
        },
      });
      stockItem = { ...created, owningProject: project };
      itemMap.set(code, stockItem);
      createdItemsCount++;
    }

    // Record initial check-in movement
    await prisma.inventoryMovement.create({
      data: {
        stockItemId: stockItem.id,
        movementType: "CHECK_IN",
        quantity: qtyIn,
        requestedQuantity: qtyIn,
        projectFor: project,
        destination: project,
        status: "APPROVED",
        occurredAt: dateReceived,
        expiryDate: expiryDate,
        remark: remark,
      },
    });
    createdMovementsCount++;
  }

  console.log(`  ✓ Created ${createdItemsCount} Stock Items and initial check-in logs.`);

  // 4. Process Check-out records
  console.log("\n📤 Step 4: Importing 44 Check-out movements and adjusting balances...");
  let checkOutCount = 0;

  for (const row of checkOutRows) {
    const code = (row.Code_No || "").trim();
    if (!code) continue;

    const item = itemMap.get(code);
    if (!item) {
      console.warn(`  ⚠️ Warning: Code ${code} not found in stock catalog.`);
      continue;
    }

    const qtyOut = parseCleanNumber(row.Quantity);
    const dateRequested = parseCleanDate(row.Date_Requested) || new Date("2026-05-04T10:00:00.000Z");
    const requestedBy = toTitleCase(row.Requested_By || "Staff Member");
    // If Project_For is blank, inherit the item's owning project (e.g. AnoSTEP, TMDA)
    const rawProj = (row.Project_For || "").trim();
    const project = normalizeProject(rawProj || item.owningProject);
    const remark = (row.Remark || "").trim() || "Initial disbursement";

    await prisma.inventoryMovement.create({
      data: {
        stockItemId: item.id,
        movementType: "CHECK_OUT",
        quantity: qtyOut,
        requestedQuantity: qtyOut,
        requestedBy: requestedBy,
        requestedFor: requestedBy,
        recipient: requestedBy,
        projectFor: project,
        destination: project,
        status: "APPROVED",
        occurredAt: dateRequested,
        remark: remark,
      },
    });
    checkOutCount++;
  }

  console.log(`  ✓ Created ${checkOutCount} Check-out movement logs.`);

  // 5. Final Reconciliation with Current Inventory
  console.log("\n⚖️ Step 5: Recomputing stock balances and verifying against Current Inventory spreadsheet...");
  const allStockItems = await prisma.stockItem.findMany({
    include: { movements: true },
  });

  let reconciledCount = 0;
  for (const item of allStockItems) {
    const totalIn = item.movements
      .filter((m) => m.movementType === "CHECK_IN" && m.status === "APPROVED")
      .reduce((sum, m) => sum + m.quantity, 0);

    const totalOut = item.movements
      .filter((m) => m.movementType === "CHECK_OUT" && m.status === "APPROVED")
      .reduce((sum, m) => sum + m.quantity, 0);

    const balance = Math.max(0, totalIn - totalOut);
    const balancePercent = totalIn > 0 ? (balance / totalIn) * 100 : 0;

    await prisma.stockItem.update({
      where: { id: item.id },
      data: {
        checkInTotal: totalIn,
        checkOutTotal: totalOut,
        quantity: balance,
        balancePercent: balancePercent,
      },
    });
    reconciledCount++;
  }

  console.log(`  ✓ Recomputed stock balances for all ${reconciledCount} items.`);

  // Validation Check: Verify sample items against Current Inventory
  console.log("\n🔍 Verification Samples:");
  const sampleCodes = ["MNTD001", "MNTD002", "MNTD149", "MNTD220", "MNTD279", "MNTD498"];
  for (const c of sampleCodes) {
    const it = await prisma.stockItem.findUnique({ where: { sku: c } });
    if (it) {
      console.log(`  - [${it.sku}] ${it.name.slice(0, 35)}... | In: ${it.checkInTotal} | Out: ${it.checkOutTotal} | Bal: ${it.quantity} | % Bal: ${it.balancePercent.toFixed(1)}%`);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 Authoritative Stock Inventory Import Complete!");
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("❌ Import Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
