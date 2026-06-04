import { google } from "googleapis";
import { logger } from "../utils/logger";

const log = logger || console;

export class GoogleSheetsSyncService {
  private static auth: any = null;
  private static sheets: any = null;
  private static spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1nwLTyUZPav5dOdzejqOWSxVWA1SzWSTsz8ioAPiQkJI";

  private static init() {
    if (this.sheets) return true;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!email || !privateKey) {
      log.info("[GoogleSheetsSync] Google Sheets service credentials not configured. Running in local-only mode.");
      return false;
    }

    try {
      // Format private key (replace literal \n with actual newlines if configured in env)
      const formattedKey = privateKey.replace(/\\n/g, "\n");

      this.auth = new google.auth.JWT({
        email,
        key: formattedKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
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
   * Syncs/appends a movement log entry (check-in or check-out) to the Movements sheet.
   */
  public static async syncMovement(movement: {
    id: string;
    stockItemSku: string;
    stockItemName: string;
    movementType: "CHECK_IN" | "CHECK_OUT";
    quantity: number;
    requestedBy?: string | null;
    projectFor?: string | null;
    status: string;
    remark?: string | null;
    occurredAt: Date;
  }) {
    if (!this.init()) return;

    try {
      // Append row to the sheet named 'Movements' or first sheet
      const range = "Movements!A:J";
      const values = [[
        movement.id,
        new Date(movement.occurredAt).toISOString(),
        movement.stockItemSku,
        movement.stockItemName,
        movement.movementType,
        movement.quantity,
        movement.requestedBy || "—",
        movement.projectFor || "—",
        movement.status,
        movement.remark || ""
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      });

      log.info(`[GoogleSheetsSync] Successfully appended movement ${movement.id} to Google Sheets.`);
    } catch (error: any) {
      log.error(error, `[GoogleSheetsSync] Failed to sync movement ${movement.id}`);
    }
  }

  /**
   * Syncs/updates a stock item's current balance and details in the 'Current Inventory' sheet.
   */
  public static async syncStockItem(item: {
    sku: string;
    name: string;
    category?: string | null;
    unit?: string | null;
    quantity: number;
    minThreshold: number;
    checkInTotal: number;
    checkOutTotal: number;
  }) {
    if (!this.init()) return;

    try {
      const sheetName = "Current Inventory";
      
      // Step 1: Read existing sheet content to find the row matching the SKU
      const readRes = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:I`,
      });

      const rows = readRes.data.values || [];
      let matchedRowIdx = -1;

      // Assuming column A is the SKU / Code_No
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === item.sku) {
          matchedRowIdx = i + 1; // 1-indexed row number
          break;
        }
      }

      const values = [[
        item.sku,
        item.name,
        item.category || "General",
        item.unit || "units",
        item.checkInTotal,
        item.checkOutTotal,
        item.quantity,
        item.minThreshold,
        item.quantity <= 0 ? "Out of Stock" : item.quantity <= item.minThreshold ? "Low Stock" : "Healthy"
      ]];

      if (matchedRowIdx !== -1) {
        // Update the existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${matchedRowIdx}:I${matchedRowIdx}`,
          valueInputOption: "RAW",
          requestBody: { values },
        });
        log.info(`[GoogleSheetsSync] Successfully updated stock item ${item.sku} in Google Sheets.`);
      } else {
        // Append as a new row
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:I`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });
        log.info(`[GoogleSheetsSync] Successfully appended new stock item ${item.sku} to Google Sheets.`);
      }
    } catch (error: any) {
      log.error(error, `[GoogleSheetsSync] Failed to sync stock item ${item.sku}`);
    }
  }

  /**
   * Syncs/pulls all stock items from the Google Sheet (or local CSV fallback) into the database.
   */
  public static async pullStockItems(prismaClient: any): Promise<{ imported: number; source: "google" | "local_csv" }> {
    const hasCreds = this.init();
    if (!hasCreds) {
      log.info("[GoogleSheetsSync] No credentials configured. Performing local CSV sync fallback.");
      const count = await this.syncFromLocalCsv(prismaClient);
      return { imported: count, source: "local_csv" };
    }

    try {
      const sheetName = "Current Inventory";
      const readRes = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:I`,
      });

      const rows = readRes.data.values || [];
      if (rows.length <= 1) {
        return { imported: 0, source: "google" };
      }

      let importedCount = 0;
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const sku = row[0]?.trim();
        const name = row[1]?.trim();
        if (!sku || !name) continue;

        const category = row[2]?.trim() || "General";
        const unit = row[3]?.trim() || "units";
        const checkInTotal = parseInt(row[4], 10) || 0;
        const checkOutTotal = parseInt(row[5], 10) || 0;
        const quantity = parseInt(row[6], 10) || 0;
        const minThreshold = parseInt(row[7], 10) || 5;

        // Upsert into db
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
        importedCount++;
      }

      return { imported: importedCount, source: "google" };
    } catch (error) {
      log.error(error as Error, "[GoogleSheetsSync] Google Sheets pull failed");
      throw error;
    }
  }

  private static async syncFromLocalCsv(prismaClient: any): Promise<number> {
    try {
      const fs = require("fs");
      const path = require("path");
      
      const candidatePaths = [
        path.resolve(process.cwd(), "MNTD Inventory Management 2026 - Current Inventory.csv"),
        path.resolve(process.cwd(), "../../MNTD Inventory Management 2026 - Current Inventory.csv"),
        path.resolve(__dirname, "../../../../MNTD Inventory Management 2026 - Current Inventory.csv"),
      ];

      const csvPath = candidatePaths.find((p: string) => fs.existsSync(p));
      if (!csvPath) {
        log.warn("[GoogleSheetsSync] Local fallback CSV not found. Skipping local sync.");
        return 0;
      }

      const csvText = fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
      const lines = csvText.split(/\r?\n/).map((line: string) => line.trimEnd()).filter((line: string) => line.trim().length > 0);
      if (lines.length <= 1) return 0;

      // Parse CSV line helper
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

      const headers = parseCsvLine(lines[0]).map((h: string) => h.trim());
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = (cells[index] ?? "").trim();
        });

        const sku = row["Code_No"] || row["SKU"];
        const name = row["Item_Description"] || row["Name"];
        if (!sku || !name) continue;

        // Parse quantity, threshold, check-in, etc.
        const parseNumber = (val: string) => {
          const cleaned = val.replace(/,/g, "");
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? 0 : num;
        };

        const quantity = parseNumber(row["Quantity"] || row["Qty"] || "0");
        const minThreshold = parseNumber(row["Min_Threshold"] || row["Min Threshold"] || "5");
        const category = row["Category"] || "General";
        const unit = row["Unit"] || "units";

        await prismaClient.stockItem.upsert({
          where: { sku },
          update: {
            name,
            category,
            unit,
            quantity,
            minThreshold,
          },
          create: {
            sku,
            barcode: sku,
            name,
            category,
            unit,
            quantity,
            minThreshold,
            checkInTotal: quantity,
            checkOutTotal: 0,
            balancePercent: 100,
          },
        });
        importedCount++;
      }

      return importedCount;
    } catch (err) {
      log.error(err as Error, "[GoogleSheetsSync] Local CSV fallback parser failed");
      return 0;
    }
  }
}
