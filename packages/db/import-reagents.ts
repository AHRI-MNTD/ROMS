import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import prisma from "./index";

const source = process.argv[2];
if (!source) {
  throw new Error("Usage: pnpm --filter @roms/db db:import-reagents -- <workbook.xlsx>");
}

const text = (value: unknown) => String(value ?? "").trim() || null;
const number = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
};
const date = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  const parsed = new Date(String(value ?? "").trim());
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};
const pick = (row: Record<string, unknown>, names: string[]) => {
  const key = Object.keys(row).find((candidate) =>
    names.some((name) => candidate.toLowerCase().replace(/[^a-z0-9]/g, "") === name),
  );
  return key ? row[key] : undefined;
};
const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

async function main() {
  const workbook = XLSX.read(fs.readFileSync(path.resolve(source)), { cellDates: true });
  let imported = 0;
  let skipped = 0;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null });
    for (const row of rows) {
    const description = text(pick(row, ["itemdescription", "items", "item", "reagentdescription", "description", "reagentname", "reagent"]));
    if (!description || description.toLowerCase().includes("master no")) {
      skipped++;
      continue;
    }

    const rawAssay = text(pick(row, ["experimenttype", "categorysourcetab", "category", "assaytype", "assay"])) ?? sheetName;
    const assayType = rawAssay || sheetName;
    const codeNo = text(pick(row, ["reagentcode", "originalsn", "masterno", "sn", "serialnumber", "serialno"]));
    const reagentCode = codeNo ? `RGT-${codeNo.padStart ? codeNo.padStart(4, "0") : codeNo}` : `IMPORTED-${sheetName}-${imported + skipped + 1}`;
    
    let concentrationValue = number(pick(row, ["concentration", "concentrationvalue"])) ?? 0;
    if (concentrationValue <= 0) {
      const vol = number(pick(row, ["volume"])) ?? 0;
      const qty = number(pick(row, ["quantity", "qty"])) ?? 1;
      concentrationValue = vol > 0 ? vol : (qty > 0 ? qty * 50 : 100);
    }

    const storageRaw = text(pick(row, ["storagecondition", "storage", "storageconditions"])) ?? "Ambient";
    let safeStorage = "Ambient";
    if (storageRaw.includes("80")) safeStorage = "80";
    else if (storageRaw.includes("20")) safeStorage = "20";
    else if (storageRaw.includes("2-8") || storageRaw.includes("4") || storageRaw.toLowerCase().includes("refri")) safeStorage = "2-8";
    else safeStorage = "Ambient";

      await prisma.reagentItem.upsert({
      where: { reagentCode },
      update: {
        description,
        assayType,
        reagentType: text(pick(row, ["reagenttype", "type"])),
        concentration: text(pick(row, ["concentration", "concentrationvalue"])),
        availableConcentration: concentrationValue,
        initialConcentration: concentrationValue,
        concentrationUnit: text(pick(row, ["concentrationunit", "unit"])),
        quantity: number(pick(row, ["quantity", "qty"])),
        quantityUnit: text(pick(row, ["quantityunit", "unit"])),
        volume: number(pick(row, ["volume"])),
        volumeUnit: text(pick(row, ["volumeunit"])),
        lotNumber: text(pick(row, ["lotnumber", "lot", "referencenumber", "reference"])),
        expiryDate: date(pick(row, ["expirydate", "expiry", "expirationdate"])),
        storageCondition: safeStorage,
        location: text(pick(row, ["location", "storagelocation"])),
        receivedFrom: text(pick(row, ["receivedfrom", "source", "supplier"])),
      },
      create: {
        reagentCode,
        description,
        assayType,
        reagentType: text(pick(row, ["reagenttype", "type"])),
        concentration: text(pick(row, ["concentration", "concentrationvalue"])),
        availableConcentration: concentrationValue,
        initialConcentration: concentrationValue,
        concentrationUnit: text(pick(row, ["concentrationunit", "unit"])),
        quantity: number(pick(row, ["quantity", "qty"])),
        quantityUnit: text(pick(row, ["quantityunit", "unit"])),
        volume: number(pick(row, ["volume"])),
        volumeUnit: text(pick(row, ["volumeunit"])),
        lotNumber: text(pick(row, ["lotnumber", "lot", "referencenumber", "reference"])),
        expiryDate: date(pick(row, ["expirydate", "expiry", "expirationdate"])),
        storageCondition: safeStorage,
        location: text(pick(row, ["location", "storagelocation"])),
        receivedFrom: text(pick(row, ["receivedfrom", "source", "supplier"])),
      },
    });
      imported++;
    }
  }

  console.log(`Imported ${imported} reagent records; skipped ${skipped} rows without a description.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});
