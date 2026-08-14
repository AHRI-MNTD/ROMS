import { google } from "googleapis";
import { logger } from "../utils/logger";

const log = logger || console;

export interface SyncMovementPayload {
  id?: string;
  stockItemSku: string;
  stockItemName: string;
  movementType: "CHECK_IN" | "CHECK_OUT";
  quantity: number;
  unit?: string | null;
  unitDescription?: string | null;
  category?: string | null;
  requestedBy?: string | null;
  projectFor?: string | null;
  status?: string;
  remark?: string | null;
  occurredAt?: Date | string;
  expiryDate?: Date | string | null;
  barcode?: string | null;
}

export interface SyncStockItemPayload {
  sku: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  quantity: number;
  minThreshold: number;
  checkInTotal: number;
  checkOutTotal: number;
}

export interface SyncMasterDataPayload {
  category?: string | null;
  unit?: string | null;
  project?: string | null;
  staff?: string | null;
}

export interface SyncPullResult {
  importedStockItems: number;
  importedCheckIns: number;
  importedCheckOuts: number;
  importedMasterData: number;
  source: "google" | "local_csv";
}

export class GoogleSheetsSyncService {
  private static auth: any = null;
  private static sheets: any = null;
  private static spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1nwLTyUZPav5dOdzejqOWSxVWA1SzWSTsz8ioAPiQkJI";

  private static init(): boolean {
    if (this.sheets) return true;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!email || !privateKey) {
      log.info("[GoogleSheetsSync] Google Sheets service credentials not configured. Running in local-only mode.");
      return false;
    }

    try {
      const formattedKey = privateKey.replace(/\\n/g, "\n");
      this.auth = new google.auth.JWT({
        email,
        key: formattedKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      this.sheets = google.sheets({ version: "v4", auth: this.auth });
      log.info(`[GoogleSheetsSync] Initialized successfully for spreadsheet: ${this.spreadsheetId}`);
      return true;
    } catch (error) {
      log.error(error as Error, "[GoogleSheetsSync] Initialization failed");
      return false;
    }
  }

  /**
   * Syncs a check-in or check-out movement to Google Sheets.
   * Check-in entries append to "Check-in" sheet.
   * Check-out entries append to "Check-out" sheet.
   */
  public static async syncMovement(movement: SyncMovementPayload) {
    if (!this.init()) return;

    try {
      const dateStr = movement.occurredAt
        ? new Date(movement.occurredAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      if (movement.movementType === "CHECK_IN") {
        const sheetName = "Check-in";
        const expiryStr = movement.expiryDate
          ? new Date(movement.expiryDate).toISOString().split("T")[0]
          : "";
        const values = [[
          movement.stockItemSku,
          movement.barcode || movement.stockItemSku,
          movement.stockItemName,
          movement.quantity,
          movement.unit || "units",
          movement.unitDescription || `${movement.unit || "units"} per pack`,
          movement.category || "General",
          movement.projectFor || "ROMS Inventory",
          dateStr,
          expiryStr,
          movement.remark || ""
        ]];

        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:K`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });

        log.info(`[GoogleSheetsSync] Appended check-in movement for ${movement.stockItemSku} to Google Sheets.`);
      } else {
        const sheetName = "Check-out";
        const values = [[
          movement.stockItemSku,
          movement.barcode || movement.stockItemSku,
          movement.stockItemName,
          movement.quantity,
          movement.unit || "units",
          movement.unitDescription || `${movement.unit || "units"} per pack`,
          movement.category || "General",
          dateStr,
          movement.requestedBy || "System User",
          movement.projectFor || "ROMS Inventory",
          movement.remark || ""
        ]];

        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:K`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });

        log.info(`[GoogleSheetsSync] Appended check-out movement for ${movement.stockItemSku} to Google Sheets.`);
      }
    } catch (error: any) {
      log.error(error, `[GoogleSheetsSync] Failed to sync movement for ${movement.stockItemSku}`);
    }
  }

  /**
   * Syncs/updates a stock item's balance in the 'Current Inventory' sheet.
   */
  public static async syncStockItem(item: SyncStockItemPayload) {
    if (!this.init()) return;

    try {
      const sheetName = "Current Inventory";
      const readRes = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:I`,
      });

      const rows = readRes.data.values || [];
      let matchedRowIdx = -1;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === item.sku) {
          matchedRowIdx = i + 1; // 1-indexed row number
          break;
        }
      }

      const balancePercentStr = item.checkInTotal > 0
        ? `${Math.round((item.quantity / item.checkInTotal) * 100)}%`
        : "0%";

      const values = [[
        item.sku,
        item.name,
        item.category || "General",
        item.unit || "units",
        item.checkInTotal,
        item.checkOutTotal,
        item.quantity,
        balancePercentStr
      ]];

      if (matchedRowIdx !== -1) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${matchedRowIdx}:H${matchedRowIdx}`,
          valueInputOption: "RAW",
          requestBody: { values },
        });
        log.info(`[GoogleSheetsSync] Updated stock item ${item.sku} in Google Sheets.`);
      } else {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:H`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });
        log.info(`[GoogleSheetsSync] Appended new stock item ${item.sku} to Google Sheets.`);
      }
    } catch (error: any) {
      log.error(error, `[GoogleSheetsSync] Failed to sync stock item ${item.sku}`);
    }
  }

  /**
   * Syncs master data record (Category, Unit of Measure, Project, Staff) to respective Google Sheet tabs.
   */
  public static async syncMasterData(data: SyncMasterDataPayload) {
    if (!this.init()) return;

    try {
      const appendIfMissing = async (sheetName: string, value: string) => {
        if (!value) return;
        const readRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!A:A`,
        });
        const rows = (readRes.data.values || []).map((r: string[]) => (r[0] || "").trim().toLowerCase());
        if (!rows.includes(value.trim().toLowerCase())) {
          await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `'${sheetName}'!A:A`,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: [[value.trim()]] },
          });
          log.info(`[GoogleSheetsSync] Appended '${value}' to '${sheetName}' in Google Sheets.`);
        }
      };

      if (data.category) await appendIfMissing("Category", data.category);
      if (data.unit) await appendIfMissing("Unit of Measure (UOM)", data.unit);
      if (data.project) await appendIfMissing("Project", data.project);
      if (data.staff) await appendIfMissing("Staff", data.staff);
    } catch (error: any) {
      log.error(error, "[GoogleSheetsSync] Master data sync failed");
    }
  }

  /**
   * Syncs deletion of a master data record from Google Sheet tabs.
   */
  public static async deleteMasterData(data: SyncMasterDataPayload) {
    if (!this.init()) return;

    try {
      const clearMatchingValue = async (sheetName: string, value: string | null | undefined) => {
        if (!value) return;
        const readRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${sheetName}'!A:A`,
        });
        const rows = readRes.data.values || [];
        const normalizedTarget = value.trim().toLowerCase();
        for (let i = 0; i < rows.length; i++) {
          const rowVal = (rows[i][0] || "").trim().toLowerCase();
          if (rowVal === normalizedTarget) {
            const rowIndex = i + 1;
            await this.sheets.spreadsheets.values.clear({
              spreadsheetId: this.spreadsheetId,
              range: `'${sheetName}'!A${rowIndex}:A${rowIndex}`,
            });
            log.info(`[GoogleSheetsSync] Cleared '${value}' from '${sheetName}' (row ${rowIndex}) in Google Sheets.`);
          }
        }
      };

      if (data.category) await clearMatchingValue("Category", data.category);
      if (data.unit) await clearMatchingValue("Unit of Measure (UOM)", data.unit);
      if (data.project) await clearMatchingValue("Project", data.project);
      if (data.staff) await clearMatchingValue("Staff", data.staff);
    } catch (error: any) {
      log.error(error, "[GoogleSheetsSync] Master data deletion sync failed");
    }
  }

  /**
   * Alias for pullAll, returning imported stock item count.
   */
  public static async pullStockItems(prismaClient: any): Promise<{ imported: number; source: "google" | "local_csv" }> {
    const res = await this.pullAll(prismaClient);
    return { imported: res.importedStockItems, source: res.source };
  }

  /**
   * Performs full bidirectional pull from Google Sheets (or CSV fallback) into database.
   */
  public static async pullAll(prismaClient: any): Promise<SyncPullResult> {
    const hasCreds = this.init();
    if (!hasCreds) {
      if (process.env.NODE_ENV === "production") {
        log.error(new Error("Google Sheets credentials absent in production"), "[GoogleSheetsSync] Cannot pull data: Google Sheets credentials are missing in production mode.");
        throw new Error("Google Sheets sync credentials are not configured in production mode.");
      }
      log.info("[GoogleSheetsSync] Credentials not configured. Running local CSV fallback sync.");
      return await this.syncFromLocalCsvs(prismaClient);
    }

    try {
      let importedStockItems = 0;
      let importedCheckIns = 0;
      let importedCheckOuts = 0;
      let importedMasterData = 0;

      // 1. Pull Current Inventory
      const currInvRes = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `'Current Inventory'!A:I`,
      });
      const currRows = currInvRes.data.values || [];
      for (let i = 1; i < currRows.length; i++) {
        const row = currRows[i];
        const sku = row[0]?.trim();
        const name = row[1]?.trim();
        if (!sku || !name) continue;

        const category = row[2]?.trim() || "General";
        const unit = row[3]?.trim() || "units";
        const checkInTotal = parseInt(row[4], 10) || 0;
        const checkOutTotal = parseInt(row[5], 10) || 0;
        const quantity = parseInt(row[6], 10) || 0;
        const minThreshold = parseInt(row[7], 10) || 5;

        await prismaClient.stockItem.upsert({
          where: { sku },
          update: {
            name,
            category,
            unit,
            checkInTotal,
            checkOutTotal,
            quantity,
            minThreshold,
            balancePercent: checkInTotal > 0 ? Math.round((quantity / checkInTotal) * 100) : 0,
          },
          create: {
            sku,
            barcode: sku,
            name,
            category,
            unit,
            checkInTotal,
            checkOutTotal,
            quantity,
            minThreshold,
            balancePercent: checkInTotal > 0 ? Math.round((quantity / checkInTotal) * 100) : 0,
          },
        });
        importedStockItems++;
      }

      // 2. Pull Check-in
      try {
        const checkInRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'Check-in'!A:K`,
        });
        const checkInRows = checkInRes.data.values || [];
        for (let i = 1; i < checkInRows.length; i++) {
          const row = checkInRows[i];
          const sku = row[0]?.trim();
          const name = row[2]?.trim();
          if (!sku || !name) continue;

          const quantity = parseInt(row[3], 10) || 0;
          if (quantity <= 0) continue;

          let stockItem = await prismaClient.stockItem.findUnique({ where: { sku } });
          if (!stockItem) {
            stockItem = await prismaClient.stockItem.create({
              data: {
                sku,
                barcode: row[1]?.trim() || sku,
                name,
                unit: row[4]?.trim() || "units",
                category: row[6]?.trim() || "General",
                quantity,
                checkInTotal: quantity,
              },
            });
          }

          const dateStr = row[8]?.trim();
          const occurredAt = dateStr && !isNaN(Date.parse(dateStr)) ? new Date(dateStr) : new Date();

          await prismaClient.inventoryMovement.create({
            data: {
              stockItemId: stockItem.id,
              movementType: "CHECK_IN",
              quantity,
              requestedBy: "Google Sheets Sync",
              projectFor: row[7]?.trim() || "ROMS Inventory",
              status: "APPROVED",
              remark: row[10]?.trim() || "Synced from Google Sheets Check-in",
              occurredAt,
            },
          });
          importedCheckIns++;
        }
      } catch (err) {
        log.warn("[GoogleSheetsSync] Check-in sheet pull encountered an issue: " + err);
      }

      // 3. Pull Check-out
      try {
        const checkOutRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'Check-out'!A:K`,
        });
        const checkOutRows = checkOutRes.data.values || [];
        for (let i = 1; i < checkOutRows.length; i++) {
          const row = checkOutRows[i];
          const sku = row[0]?.trim();
          const name = row[2]?.trim();
          if (!sku || !name) continue;

          const quantity = parseInt(row[3], 10) || 0;
          if (quantity <= 0) continue;

          let stockItem = await prismaClient.stockItem.findUnique({ where: { sku } });
          if (!stockItem) {
            stockItem = await prismaClient.stockItem.create({
              data: {
                sku,
                barcode: row[1]?.trim() || sku,
                name,
                unit: row[4]?.trim() || "units",
                category: row[6]?.trim() || "General",
                quantity: 0,
                checkOutTotal: quantity,
              },
            });
          }

          const dateStr = row[7]?.trim();
          const occurredAt = dateStr && !isNaN(Date.parse(dateStr)) ? new Date(dateStr) : new Date();

          await prismaClient.inventoryMovement.create({
            data: {
              stockItemId: stockItem.id,
              movementType: "CHECK_OUT",
              quantity,
              requestedBy: row[8]?.trim() || "Google Sheets Sync",
              projectFor: row[9]?.trim() || "ROMS Inventory",
              status: "APPROVED",
              remark: row[10]?.trim() || "Synced from Google Sheets Check-out",
              occurredAt,
            },
          });
          importedCheckOuts++;
        }
      } catch (err) {
        log.warn("[GoogleSheetsSync] Check-out sheet pull encountered an issue: " + err);
      }

      // 4. Pull Master Data tabs
      try {
        const masterTabs = [
          { tab: "Category", field: "category" },
          { tab: "Unit of Measure (UOM)", field: "unit" },
          { tab: "Project", field: "project" },
          { tab: "Staff", field: "staff" },
        ];

        for (const t of masterTabs) {
          try {
            const res = await this.sheets.spreadsheets.values.get({
              spreadsheetId: this.spreadsheetId,
              range: `'${t.tab}'!A:A`,
            });
            const rows = res.data.values || [];
            for (let i = 1; i < rows.length; i++) {
              const val = rows[i][0]?.trim();
              if (!val) continue;

              const existing = await prismaClient.inventoryMasterData.findFirst({
                where: { [t.field]: val },
              });

              if (!existing) {
                await prismaClient.inventoryMasterData.create({
                  data: {
                    category: t.field === "category" ? val : "General",
                    unit: t.field === "unit" ? val : "units",
                    project: t.field === "project" ? val : null,
                    staff: t.field === "staff" ? val : null,
                  },
                });
                importedMasterData++;
              }
            }
          } catch (err) {
            log.warn(`[GoogleSheetsSync] Tab '${t.tab}' pull failed: ` + err);
          }
        }
      } catch (err) {
        log.warn("[GoogleSheetsSync] Master data pull encountered an issue: " + err);
      }

      return {
        importedStockItems,
        importedCheckIns,
        importedCheckOuts,
        importedMasterData,
        source: "google",
      };
    } catch (error) {
      log.error(error as Error, "[GoogleSheetsSync] Google Sheets pull failed");
      throw error;
    }
  }

  /**
   * Local CSV sync fallback when Google credentials are not configured.
   */
  private static async syncFromLocalCsvs(prismaClient: any): Promise<SyncPullResult> {
    try {
      const fs = require("fs");
      const path = require("path");

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const parseNumber = (val: string) => {
        if (!val) return 0;
        const cleaned = val.replace(/,/g, "").replace(/%/g, "").trim();
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? 0 : num;
      };

      let importedStockItems = 0;
      let importedCheckIns = 0;
      let importedCheckOuts = 0;
      let importedMasterData = 0;

      // 1. Current Inventory CSV
      const currPaths = [
        path.resolve(process.cwd(), "MNTD Inventory Management 2026 - Current Inventory.csv"),
        path.resolve(process.cwd(), "../../MNTD Inventory Management 2026 - Current Inventory.csv"),
        path.resolve(__dirname, "../../../../MNTD Inventory Management 2026 - Current Inventory.csv"),
      ];
      const currCsvPath = currPaths.find((p: string) => fs.existsSync(p));

      if (currCsvPath) {
        const csvText = fs.readFileSync(currCsvPath, "utf-8").replace(/^\uFEFF/, "");
        const lines = csvText.split(/\r?\n/).map((l: string) => l.trimEnd()).filter((l: string) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = parseCsvLine(lines[0]).map((h: string) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const cells = parseCsvLine(lines[i]);
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });

            const sku = row["Code_No"] || row["SKU"];
            const name = row["Item_Description"] || row["Name"];
            if (!sku || !name) continue;

            const quantity = parseNumber(row["Balance"] || row["Quantity"] || "0");
            const checkInTotal = parseNumber(row["Check-in total"] || "0");
            const checkOutTotal = parseNumber(row["Check-out total"] || "0");
            const category = row["Category"] || "General";
            const unit = row["Unit"] || "units";

            await prismaClient.stockItem.upsert({
              where: { sku },
              update: {
                name,
                category,
                unit,
                checkInTotal,
                checkOutTotal,
                quantity,
              },
              create: {
                sku,
                barcode: sku,
                name,
                category,
                unit,
                checkInTotal,
                checkOutTotal,
                quantity,
                minThreshold: 5,
                balancePercent: checkInTotal > 0 ? Math.round((quantity / checkInTotal) * 100) : 100,
              },
            });
            importedStockItems++;
          }
        }
      }

      // 2. Master Data CSV
      const masterPaths = [
        path.resolve(process.cwd(), "BOMS_Inventory_Master_Data.csv"),
        path.resolve(process.cwd(), "../../BOMS_Inventory_Master_Data.csv"),
        path.resolve(__dirname, "../../../../BOMS_Inventory_Master_Data.csv"),
      ];
      const masterCsvPath = masterPaths.find((p: string) => fs.existsSync(p));

      if (masterCsvPath) {
        const csvText = fs.readFileSync(masterCsvPath, "utf-8").replace(/^\uFEFF/, "");
        const lines = csvText.split(/\r?\n/).map((l: string) => l.trimEnd()).filter((l: string) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = parseCsvLine(lines[0]).map((h: string) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const cells = parseCsvLine(lines[i]);
            const cat = cells[0]?.trim();
            const un = cells[1]?.trim();
            const proj = cells[2]?.trim();
            const st = cells[3]?.trim();

            if (cat || un || proj || st) {
              const existing = await prismaClient.inventoryMasterData.findFirst({
                where: {
                  category: cat || "General",
                  unit: un || "units",
                  project: proj || null,
                  staff: st || null,
                },
              });
              if (!existing) {
                await prismaClient.inventoryMasterData.create({
                  data: {
                    category: cat || "General",
                    unit: un || "units",
                    project: proj || null,
                    staff: st || null,
                  },
                });
                importedMasterData++;
              }
            }
          }
        }
      }

      return {
        importedStockItems,
        importedCheckIns,
        importedCheckOuts,
        importedMasterData,
        source: "local_csv",
      };
    } catch (err) {
      log.error(err as Error, "[GoogleSheetsSync] Local CSV fallback parser failed");
      return {
        importedStockItems: 0,
        importedCheckIns: 0,
        importedCheckOuts: 0,
        importedMasterData: 0,
        source: "local_csv",
      };
    }
  }
}

