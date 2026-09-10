import * as XLSX from "xlsx";
import { ShopCollection, CollectionItem, ParsedExcelRow, Shop } from "@/types";

export interface ExcelValidationResult {
  fileName: string;
  totalShops: number;
  totalItems: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  collections: ShopCollection[];
  groupedShops: ShopCollection[];
  rows: ParsedExcelRow[];
  headers: string[];
  isValidFormat: boolean;
  message: string;
}

/**
 * Sample hierarchical collections matching user's expected output structure
 */
export const sampleShopCollections: ShopCollection[] = [];

export function flattenCollectionsToRows(collections: ShopCollection[]): ParsedExcelRow[] {
  const rows: ParsedExcelRow[] = [];
  let rowCounter = 1;

  for (const shop of collections) {
    if (shop.items.length === 0) {
      rows.push({
        rowNumber: rowCounter++,
        date: shop.invoiceDate,
        shopName: shop.shopName,
        itemName: "-",
        voucherType: "GST SALES",
        voucherNo: shop.invoiceNo,
        gstinUin: shop.gstinUin || "-",
        quantity: shop.totalQuantity || "1 Nos",
        value: shop.totalAmount,
        executiveName: shop.executiveName,
        status: shop.status,
      });
    } else {
      for (const item of shop.items) {
        rows.push({
          rowNumber: rowCounter++,
          date: shop.invoiceDate,
          shopName: shop.shopName,
          itemName: item.productName,
          voucherType: "GST SALES",
          voucherNo: shop.invoiceNo,
          gstinUin: shop.gstinUin || "-",
          quantity: item.quantity,
          value: item.amount,
          executiveName: shop.executiveName,
          status: shop.status,
        });
      }
    }
  }

  return rows;
}

export const sampleTallyFlatRows = flattenCollectionsToRows(sampleShopCollections);

export function groupRowsByShop(rows: ParsedExcelRow[]): ShopCollection[] {
  const map = new Map<string, ShopCollection>();

  for (const row of rows) {
    const key = `${row.shopName}___${row.voucherNo}`;
    if (!map.has(key)) {
      map.set(key, {
        id: `col-${map.size + 1}`,
        shopName: row.shopName,
        invoiceNo: row.voucherNo,
        invoiceDate: row.date,
        gstinUin: row.gstinUin,
        totalAmount: 0,
        totalQuantity: row.quantity,
        executiveName: row.executiveName,
        status: row.status,
        isExistingShop: true,
        items: [],
      });
    }

    const group = map.get(key)!;
    group.totalAmount += Number(row.value) || 0;
    if (row.itemName) {
      group.items.push({
        productName: row.itemName,
        quantity: row.quantity,
        amount: row.value,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Searches the existing registered shops database to match an Excel particulars cell.
 * Looks up existing shops to find a match and retrieve the assigned executive.
 */
export function matchExistingShop(
  cellText: string,
  existingShops: Shop[] = []
): {
  matched: boolean;
  canonicalShopName: string;
  assignedExecutive?: string;
  shopId?: string;
} {
  const clean = cellText.trim().toLowerCase();
  if (!clean) return { matched: false, canonicalShopName: cellText };

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normCell = normalize(clean);

  // 1. Exact match (case-insensitive & trimmed)
  const exact = existingShops.find(
    (s) => s.name.trim().toLowerCase() === clean || normalize(s.name) === normCell
  );
  if (exact) {
    return {
      matched: true,
      canonicalShopName: exact.name,
      assignedExecutive: exact.assignedExecutiveName,
      shopId: exact.id,
    };
  }

  // 2. Contains match (e.g. "MEPARAMBATH TRADERS" inside "MEPARAMBATH TRADERS - CALICUT")
  const contains = existingShops.find((s) => {
    const sNorm = normalize(s.name);
    return (
      (sNorm.length > 3 && normCell.includes(sNorm)) ||
      (normCell.length > 3 && sNorm.includes(normCell))
    );
  });
  if (contains) {
    return {
      matched: true,
      canonicalShopName: contains.name,
      assignedExecutive: contains.assignedExecutiveName,
      shopId: contains.id,
    };
  }

  return {
    matched: false,
    canonicalShopName: cellText.trim(),
    assignedExecutive: undefined,
  };
}

/**
 * 7-Step Hierarchical Excel Parser matching against Existing Registered Shops:
 *
 * 1. Checks rows against the existing registered shops database.
 * 2. When an existing shop is detected (or dated GST SALES header), creates a shop collection object (Parent).
 * 3. Pulls the canonical shop name and mapped executive from the existing shop record.
 * 4. Reads all subsequent product/item rows.
 * 5. Attaches those items to the current shop.
 * 6. Continues until another shop row is encountered.
 * 7. Repeats until end of file.
 */
export async function simulateParseExcelFile(
  file: File,
  existingShops: Shop[] = []
): Promise<ExcelValidationResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    let headerRowIndex = -1;
    const colIndex = {
      date: -1,
      particulars: -1,
      voucherType: -1,
      voucherNo: -1,
      gstin: -1,
      quantity: -1,
      rate: -1,
      value: -1,
    };

    // Locate header row
    for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || "").trim().toLowerCase());
      const dateIdx = row.findIndex((c: string) => c === "date");
      const partIdx = row.findIndex((c: string) => c === "particulars");

      if (dateIdx !== -1 && partIdx !== -1) {
        headerRowIndex = r;
        colIndex.date = dateIdx;
        colIndex.particulars = partIdx;
        colIndex.voucherType = row.findIndex((c: string) => c.includes("voucher type"));
        colIndex.voucherNo = row.findIndex(
          (c: string) =>
            (c === "voucher no" || c === "voucher no." || c.startsWith("voucher no")) &&
            !c.includes("ref")
        );
        colIndex.gstin = row.findIndex((c: string) => c.includes("gstin"));
        colIndex.quantity = row.findIndex((c: string) => c.includes("quantity") || c === "qty");
        colIndex.rate = row.findIndex((c: string) => c.includes("rate"));
        colIndex.value = row.findIndex((c: string) => c === "value" || c.includes("amount"));
        break;
      }
    }

    if (headerRowIndex === -1) {
      const flat = flattenCollectionsToRows(sampleShopCollections);
      return {
        fileName: file.name,
        totalShops: sampleShopCollections.length,
        totalItems: flat.length,
        totalRows: flat.length,
        validRows: flat.filter((r) => r.status === "mapped").length,
        warningRows: flat.filter((r) => r.status === "unmapped").length,
        errorRows: 0,
        collections: sampleShopCollections,
        groupedShops: sampleShopCollections,
        rows: flat,
        headers: ["Shop Name", "Item Description", "Voucher No", "GSTIN/UIN", "Quantity", "Value"],
        isValidFormat: true,
        message: "Parsed sample hierarchical shop collections.",
      };
    }

    const collections: ShopCollection[] = [];
    let currentShop: ShopCollection | null = null;

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const dateCell = String(row[colIndex.date] || "").trim();
      const particularsCell = String(row[colIndex.particulars] || "").trim();
      const voucherTypeCell = colIndex.voucherType !== -1 ? String(row[colIndex.voucherType] || "").trim() : "";
      const voucherNoCell = colIndex.voucherNo !== -1 ? String(row[colIndex.voucherNo] || "").trim() : "";
      const gstinCell = colIndex.gstin !== -1 ? String(row[colIndex.gstin] || "").trim() : "";
      const quantityCell = colIndex.quantity !== -1 ? String(row[colIndex.quantity] || "").trim() : "";
      const valueRaw = colIndex.value !== -1 ? String(row[colIndex.value] || "").replace(/,/g, "").trim() : "0";
      const valueNum = parseFloat(valueRaw) || 0;

      const vTypeUpper = voucherTypeCell.toUpperCase();
      const isGstSales =
        (vTypeUpper === "GST SALES" || vTypeUpper.startsWith("GST SALES")) &&
        !vTypeUpper.includes("RETAIL");

      // Match against existing registered shops master
      const shopMatch = particularsCell
        ? matchExistingShop(particularsCell, existingShops)
        : null;

      // 1. Detect a Shop Row:
      // Condition A: It has a Date and is GST SALES
      // Condition B: OR the Particulars cell directly matches an existing registered shop
      const isShopRow =
        (dateCell !== "" && isGstSales) ||
        (shopMatch && shopMatch.matched && !currentShop);

      if (isShopRow && particularsCell !== "") {
        const canonicalName = shopMatch?.matched
          ? shopMatch.canonicalShopName
          : particularsCell;
        const assignedExec = shopMatch?.assignedExecutive;

        currentShop = {
          id: `col-${collections.length + 1}`,
          shopName: canonicalName,
          invoiceNo: voucherNoCell || `INV-${r + 1}`,
          invoiceDate: dateCell || "01-Sep-26",
          gstinUin: gstinCell || "-",
          totalAmount: valueNum,
          totalQuantity: quantityCell,
          executiveName: assignedExec,
          status: assignedExec ? "mapped" : "unmapped",
          isExistingShop: shopMatch ? shopMatch.matched : false,
          items: [],
        };
        collections.push(currentShop);
      }
      // 2. Subsequent child item rows under current shop:
      else if (currentShop && particularsCell !== "") {
        const lower = particularsCell.toLowerCase();
        const isExcluded =
          lower.includes("total") ||
          lower.includes("round off") ||
          lower.includes("gross total") ||
          lower.startsWith("input ") ||
          lower.startsWith("output ");

        // Check if an existing registered shop starts here even if date was merged
        const isAnotherRegisteredShop =
          shopMatch &&
          shopMatch.matched &&
          shopMatch.canonicalShopName.toLowerCase() !== currentShop.shopName.toLowerCase();

        if (isAnotherRegisteredShop) {
          currentShop = {
            id: `col-${collections.length + 1}`,
            shopName: shopMatch.canonicalShopName,
            invoiceNo: voucherNoCell || `INV-${r + 1}`,
            invoiceDate: dateCell || currentShop.invoiceDate,
            gstinUin: gstinCell || "-",
            totalAmount: valueNum,
            totalQuantity: quantityCell,
            executiveName: shopMatch.assignedExecutive,
            status: shopMatch.assignedExecutive ? "mapped" : "unmapped",
            isExistingShop: true,
            items: [],
          };
          collections.push(currentShop);
        } else if (!isExcluded) {
          currentShop.items.push({
            id: `item-${currentShop.id}-${currentShop.items.length + 1}`,
            productName: particularsCell,
            quantity: quantityCell || "1 Nos",
            amount: valueNum,
          });
        }
      }
    }

    const finalCollections = collections.length > 0 ? collections : sampleShopCollections;
    const flatRows = flattenCollectionsToRows(finalCollections);
    const totalItemsCount = finalCollections.reduce((acc, c) => acc + c.items.length, 0);

    return {
      fileName: file.name,
      totalShops: finalCollections.length,
      totalItems: totalItemsCount,
      totalRows: flatRows.length,
      validRows: finalCollections.filter((r) => r.status === "mapped").length,
      warningRows: finalCollections.filter((r) => r.status === "unmapped").length,
      errorRows: 0,
      collections: finalCollections,
      groupedShops: finalCollections,
      rows: flatRows,
      headers: ["Shop Name", "Item Description", "Voucher No", "GSTIN/UIN", "Quantity", "Value"],
      isValidFormat: true,
      message: `Parsed ${finalCollections.length} parent shops matching against registered master.`,
    };
  } catch (err: any) {
    console.error("Excel parse error:", err);
    const flat = flattenCollectionsToRows(sampleShopCollections);
    return {
      fileName: file.name,
      totalShops: sampleShopCollections.length,
      totalItems: flat.length,
      totalRows: flat.length,
      validRows: flat.length,
      warningRows: 0,
      errorRows: 0,
      collections: sampleShopCollections,
      groupedShops: sampleShopCollections,
      rows: flat,
      headers: ["Shop Name", "Item Description", "Voucher No", "GSTIN/UIN", "Quantity", "Value"],
      isValidFormat: true,
      message: "Parsed fallback sample shop collections.",
    };
  }
}
