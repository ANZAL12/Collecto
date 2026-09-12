import * as XLSX from "xlsx";
import { ShopCollection, CollectionItem, ParsedExcelRow, Shop, Company } from "@/types";

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
  existingShops: Shop[] = [],
  companyId?: string,
  companyName?: string
): {
  matched: boolean;
  canonicalShopName: string;
  assignedExecutive?: string;
  shopId?: string;
  matchedCompany?: string;
  isNotUnique?: boolean;
  uniquenessMessage?: string;
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
  const normTargetCompany = companyName?.trim().toLowerCase();

  // Helper to test if a candidate shop belongs to the target company / brand
  const matchesCompany = (s: Shop) => {
    if (!companyId && !companyName) return true;
    if (companyId && (s.companyId === companyId || s.brandId === companyId)) return true;
    if (normTargetCompany) {
      const sComp = s.companyName?.trim().toLowerCase();
      const sBrand = s.brandName?.trim().toLowerCase();
      if (sComp === normTargetCompany || sBrand === normTargetCompany) return true;
    }
    return false;
  };

  // Find all shops matching this name across all companies
  const exactMatches = existingShops.filter(
    (s) => s.name.trim().toLowerCase() === clean || normalize(s.name) === normCell
  );
  const containsMatches = existingShops.filter((s) => {
    const sNorm = normalize(s.name);
    return (
      (sNorm.length > 3 && normCell.includes(sNorm)) ||
      (normCell.length > 3 && sNorm.includes(normCell))
    );
  });
  const allMatches = exactMatches.length > 0 ? exactMatches : containsMatches;

  const otherCompanies = Array.from(
    new Set(
      allMatches
        .map((s) => s.companyName || s.brandName)
        .filter((c): c is string => Boolean(c) && typeof c === "string" && c.toLowerCase() !== normTargetCompany)
    )
  );

  const isMultiBrand = otherCompanies.length > 0;

  // 1. HIGHEST PRIORITY: Exact match on shop name FOR THAT PARTICULAR COMPANY
  if (companyId || companyName) {
    const exactCompany = existingShops.find(
      (s) =>
        (s.name.trim().toLowerCase() === clean || normalize(s.name) === normCell) &&
        matchesCompany(s)
    );
    if (exactCompany) {
      return {
        matched: true,
        canonicalShopName: exactCompany.name,
        assignedExecutive: exactCompany.assignedExecutiveName,
        shopId: exactCompany.id,
        matchedCompany: exactCompany.companyName || exactCompany.brandName,
        isNotUnique: false,
        uniquenessMessage: undefined,
      };
    }

    // 2. SECOND PRIORITY: Contains match on shop name FOR THAT PARTICULAR COMPANY
    const containsCompany = existingShops.find((s) => {
      if (!matchesCompany(s)) return false;
      const sNorm = normalize(s.name);
      return (
        (sNorm.length > 3 && normCell.includes(sNorm)) ||
        (normCell.length > 3 && sNorm.includes(normCell))
      );
    });
    if (containsCompany) {
      return {
        matched: true,
        canonicalShopName: containsCompany.name,
        assignedExecutive: containsCompany.assignedExecutiveName,
        shopId: containsCompany.id,
        matchedCompany: containsCompany.companyName || containsCompany.brandName,
        isNotUnique: false,
        uniquenessMessage: undefined,
      };
    }
  }

  // Helper to determine if the target company has a sole dedicated executive across registered shops
  let companyDedicatedExec: string | undefined = undefined;
  if (normTargetCompany) {
    const targetCompExecs = Array.from(
      new Set(
        existingShops
          .filter((s) => {
            const c = (s.companyName || s.brandName || "").toLowerCase();
            return c === normTargetCompany && Boolean(s.assignedExecutiveName?.trim());
          })
          .map((s) => s.assignedExecutiveName!.trim())
      )
    );
    if (targetCompExecs.length === 1) {
      companyDedicatedExec = targetCompExecs[0];
    }
  }

  // 3. FALLBACK: Exact match with no company assigned / general mapping
  const genericExact = existingShops.find(
    (s) =>
      (s.name.trim().toLowerCase() === clean || normalize(s.name) === normCell) &&
      !s.companyId &&
      !s.companyName
  );
  if (genericExact) {
    const notUnique = allMatches.length > 1 || isMultiBrand;
    // If the collection belongs to a specific company, and the shop is only generically mapped or mapped to another brand,
    // do NOT inherit the executive assignment from another brand. Use dedicated brand executive if available.
    const isTargetingSpecificCompany = Boolean(companyId || companyName);
    const assignedExec = isTargetingSpecificCompany ? companyDedicatedExec : genericExact.assignedExecutiveName;

    return {
      matched: true,
      canonicalShopName: genericExact.name,
      assignedExecutive: assignedExec,
      shopId: genericExact.id,
      matchedCompany: genericExact.companyName || genericExact.brandName || companyName,
      isNotUnique: !assignedExec && notUnique,
      uniquenessMessage: !assignedExec && companyName
        ? `Unassigned for ${companyName}`
        : undefined,
    };
  }

  // 4. FALLBACK: Any exact match across all shops (from other companies)
  // The shop exists in the master database (so it is a known/registered shop name).
  // If the target company has a dedicated executive (e.g. General -> riyas), assign them!
  // Otherwise, leave unassigned so it never incorrectly inherits a different brand's executive.
  const anyExact = existingShops.find(
    (s) => s.name.trim().toLowerCase() === clean || normalize(s.name) === normCell
  );
  if (anyExact) {
    const comp = anyExact.companyName || anyExact.brandName || "Other brand";
    const assignedExec = companyDedicatedExec;

    return {
      matched: true,
      canonicalShopName: anyExact.name,
      assignedExecutive: assignedExec,
      shopId: anyExact.id,
      matchedCompany: companyName || comp,
      isNotUnique: !assignedExec,
      uniquenessMessage:
        !assignedExec && companyName && comp.toLowerCase() !== normTargetCompany
          ? `Unassigned for ${companyName}`
          : undefined,
    };
  }

  // 5. FALLBACK: Any contains match across all shops
  const anyContains = existingShops.find((s) => {
    const sNorm = normalize(s.name);
    return (
      (sNorm.length > 3 && normCell.includes(sNorm)) ||
      (normCell.length > 3 && sNorm.includes(normCell))
    );
  });
  if (anyContains) {
    const comp = anyContains.companyName || anyContains.brandName || "Other brand";
    const assignedExec = companyDedicatedExec;

    return {
      matched: true,
      canonicalShopName: anyContains.name,
      assignedExecutive: assignedExec,
      shopId: anyContains.id,
      matchedCompany: companyName || comp,
      isNotUnique: !assignedExec,
      uniquenessMessage:
        !assignedExec && companyName && comp.toLowerCase() !== normTargetCompany
          ? `Unassigned for ${companyName}`
          : undefined,
    };
  }

  return {
    matched: false,
    canonicalShopName: cellText.trim(),
    assignedExecutive: companyDedicatedExec,
  };
}

export function isExcludedParticulars(text: string): boolean {
  const clean = text.trim().toLowerCase();
  if (!clean || clean === "-" || clean === "na" || clean === "n/a" || clean === "nil" || clean === "none") return true;
  return (
    clean.includes("cancel") || // matches cancelled, canceled, cancellation, (cancelled), etc.
    clean.includes("void") ||
    clean.includes("delete") ||
    clean.includes("rejected") ||
    clean.includes("total") ||
    clean.includes("round off") ||
    clean.includes("gross total") ||
    clean.startsWith("input ") ||
    clean.startsWith("output ") ||
    clean === "cgst" ||
    clean === "sgst" ||
    clean === "igst" ||
    clean.startsWith("cgst ") ||
    clean.startsWith("sgst ") ||
    clean.startsWith("igst ") ||
    clean.startsWith("cess ")
  );
}

/**
 * 7-Step Hierarchical Excel Parser matching against Existing Registered Shops:
 *
 * 1. Checks rows against the existing registered shops database.
 * 2. When a shop row is detected (existing registered OR brand new shop in spreadsheet),
 *    creates a parent shop collection object.
 * 3. Pulls the canonical shop name and mapped executive if already registered.
 * 4. Reads all subsequent product/item rows under that shop.
 * 5. Attaches items to the current parent shop until another shop row is encountered.
 * 6. Skips cancelled vouchers, total rows, tax rows, and invalid shops.
 * 7. Repeats until end of file.
 */
export async function simulateParseExcelFile(
  file: File,
  existingShops: Shop[] = [],
  companyId?: string,
  companyName?: string
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
    for (let r = 0; r < Math.min(rawRows.length, 40); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || "").trim().toLowerCase());
      const dateIdx = row.findIndex((c: string) => c === "date");
      const partIdx = row.findIndex((c: string) => c === "particulars" || c === "particular");

      if (dateIdx !== -1 && partIdx !== -1) {
        headerRowIndex = r;
        colIndex.date = dateIdx;
        colIndex.particulars = partIdx;
        colIndex.voucherType = row.findIndex(
          (c: string) =>
            c.includes("voucher type") ||
            c.includes("vch type") ||
            c === "vch type" ||
            c === "voucher type" ||
            c === "vch. type" ||
            c === "vouchertype"
        );
        colIndex.voucherNo = row.findIndex(
          (c: string) =>
            (c === "voucher no" ||
              c === "voucher no." ||
              c.startsWith("voucher no") ||
              c === "vch no" ||
              c === "vch no." ||
              c.startsWith("vch no") ||
              c === "vchno" ||
              c.includes("invoice no") ||
              c.includes("inv no")) &&
            !c.includes("ref")
        );
        colIndex.gstin = row.findIndex((c: string) => c.includes("gstin"));
        colIndex.quantity = row.findIndex((c: string) => c.includes("quantity") || c === "qty");
        colIndex.rate = row.findIndex((c: string) => c.includes("rate"));
        colIndex.value = row.findIndex(
          (c: string) =>
            c === "value" ||
            c.includes("amount") ||
            c.includes("debit") ||
            c.includes("taxable") ||
            c === "total"
        );
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        fileName: file.name,
        totalShops: 0,
        totalItems: 0,
        totalRows: 0,
        validRows: 0,
        warningRows: 0,
        errorRows: 0,
        collections: [],
        groupedShops: [],
        rows: [],
        headers: ["Shop Name", "Item Description", "Voucher No", "GSTIN/UIN", "Quantity", "Value"],
        isValidFormat: false,
        message: "Could not find header row with 'Date' and 'Particulars'. Please verify your spreadsheet headers.",
      };
    }

    const collections: ShopCollection[] = [];
    let currentShop: ShopCollection | null = null;
    let isCurrentInvoiceSkipped = false;

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

      if (!particularsCell) continue;

      const isExcluded = isExcludedParticulars(particularsCell);
      const isCancelled =
        isExcluded ||
        voucherTypeCell.toLowerCase().includes("cancel") ||
        voucherNoCell.toLowerCase().includes("cancel");

      // If a cancelled voucher or total/tax row is encountered, reset currentShop boundary
      if (isCancelled) {
        if (dateCell !== "" || voucherNoCell !== "") {
          currentShop = null;
          isCurrentInvoiceSkipped = true;
        }
        continue;
      }

      const vTypeNorm = voucherTypeCell
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Rule: GST SALE RETAIL (or any retail voucher) is NOT considered!
      const isRetail = vTypeNorm.includes("RETAIL");

      // Rule: If voucher type column exists and has a value, ONLY "GST SALES" (or standard sales vouchers) are considered!
      const isGstSalesOnly =
        !isRetail &&
        (vTypeNorm === "GST SALES" ||
         vTypeNorm === "GST SALE" ||
         vTypeNorm.startsWith("GST SALES") ||
         vTypeNorm.startsWith("GST SALE") ||
         vTypeNorm === "SALES" ||
         vTypeNorm === "SALE" ||
         vTypeNorm === "TAX INVOICE");

      // If this row has an explicit voucher type that is NOT GST SALES (e.g. GST SALE RETAIL, Receipt, Payment, etc.)
      if (voucherTypeCell !== "" && (!isGstSalesOnly || isRetail)) {
        currentShop = null;
        isCurrentInvoiceSkipped = true;
        continue;
      }

      // If voucher type is empty on a child item row, but the parent invoice was skipped (e.g. was retail), skip child items too
      if (voucherTypeCell === "" && isCurrentInvoiceSkipped) {
        if (dateCell === "" && voucherNoCell === "") {
          continue;
        }
      }

      // Check if matched in registered shops master (prioritizing the target company)
      const shopMatch = matchExistingShop(particularsCell, existingShops, companyId, companyName);

      // Detect a Shop (Parent) row:
      // A. Explicit registered shop match (different from current shop)
      const isRegisteredShopMatch =
        shopMatch &&
        shopMatch.matched &&
        (!currentShop || shopMatch.canonicalShopName.toLowerCase() !== currentShop.shopName.toLowerCase());

      // B. A new invoice header row with GST SALES voucher type or invoice indicators
      const isNewInvoiceRow =
        (colIndex.voucherType !== -1 && isGstSalesOnly) ||
        (colIndex.voucherType === -1 && (dateCell !== "" || voucherNoCell !== "" || (gstinCell !== "" && gstinCell !== "-")));

      const isShopRow = isRegisteredShopMatch || isNewInvoiceRow;

      if (isShopRow) {
        isCurrentInvoiceSkipped = false;
        const isExisting = shopMatch ? shopMatch.matched : false;
        const canonicalName = isExisting
          ? shopMatch!.canonicalShopName
          : particularsCell.trim();
        const assignedExec = isExisting ? shopMatch!.assignedExecutive : undefined;

        currentShop = {
          id: `col-${collections.length + 1}`,
          shopName: canonicalName,
          invoiceNo: voucherNoCell || `INV-${r + 1}`,
          invoiceDate: dateCell || (currentShop ? currentShop.invoiceDate : "01-Sep-26"),
          gstinUin: gstinCell || "-",
          totalAmount: valueNum,
          totalQuantity: quantityCell,
          executiveName: assignedExec,
          companyId: companyId,
          companyName: companyName,
          brandId: companyId,
          brandName: companyName,
          status: assignedExec ? "mapped" : "unmapped",
          isExistingShop: isExisting,
          isNotUnique: shopMatch?.isNotUnique,
          uniquenessMessage: shopMatch?.uniquenessMessage,
          items: [],
        };
        collections.push(currentShop);
      } else if (currentShop && !isCurrentInvoiceSkipped) {
        // Child item row under the active parent shop
        currentShop.items.push({
          id: `item-${currentShop.id}-${currentShop.items.length + 1}`,
          productName: particularsCell.trim(),
          quantity: quantityCell || "1 Nos",
          amount: valueNum,
          companyId: companyId,
          companyName: companyName,
          brandId: companyId,
          brandName: companyName,
        });
      }
    }

    // If any parent shop total was 0, calculate sum of child items
    for (const shop of collections) {
      if (shop.totalAmount === 0 && shop.items.length > 0) {
        shop.totalAmount = shop.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
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
      validRows: finalCollections.filter((r) => Boolean(r.executiveName) && r.status === "mapped").length,
      warningRows: finalCollections.filter((r) => !r.executiveName || r.status === "unmapped").length,
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

/**
 * Maps a Voucher Type (e.g. "CARRIER AC", "FORMENTY", "GENERAL", "ROCKWELL") to a registered Company.
 */
export function matchCompanyByVoucherType(
  voucherType: string,
  companies: Company[] = []
): { matched: boolean; company?: Company; companyName: string; companyId?: string } {
  const clean = voucherType.trim();
  if (!clean) return { matched: false, companyName: "General" };

  const normVoucher = clean
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Direct exact match with company name or code
  for (const comp of companies) {
    const compNameNorm = comp.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const compCodeNorm = (comp.code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normVoucher === compNameNorm || (compCodeNorm && normVoucher === compCodeNorm)) {
      return { matched: true, company: comp, companyName: comp.name, companyId: comp.id };
    }
  }

  // 2. Token / word / prefix matching:
  // e.g. "CARRIER AC" contains "CARRIER", "FORMENTY" matches "FORMENTY"
  const voucherWords = normVoucher.split(" ");
  for (const comp of companies) {
    const compNameNorm = comp.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const compCodeNorm = (comp.code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      (compNameNorm.length > 2 && voucherWords.includes(compNameNorm)) ||
      (compCodeNorm.length > 2 && voucherWords.includes(compCodeNorm)) ||
      (compNameNorm.length > 2 && normVoucher.startsWith(compNameNorm)) ||
      (compCodeNorm.length > 2 && normVoucher.startsWith(compCodeNorm)) ||
      (compNameNorm.length > 2 && normVoucher.includes(compNameNorm)) ||
      (compCodeNorm.length > 2 && normVoucher.includes(compCodeNorm))
    ) {
      return { matched: true, company: comp, companyName: comp.name, companyId: comp.id };
    }
  }

  // Fallback: If no company in DB matched, return clean voucher type as the company name
  return { matched: false, companyName: clean, companyId: undefined };
}

/**
 * Technique 2: Upload Sales Register parser
 *
 * Rules:
 * 1. The voucher type "Retail Bill" is ignored.
 * 2. All other voucher types determine which company (e.g. "CARRIER AC", "FORMENTY", "GENERAL", "ROCKWELL").
 * 3. If a company is selected, parses ONLY that company's details and item list.
 * 4. Gross Total is captured as the total collection amount (fallback to Value).
 * 5. Parent shop captures canonical shop name and mapped executive from registered master.
 * 6. Child items under each shop capture item description, quantity, and value.
 */
export async function parseSalesRegisterExcelFile(
  file: File,
  existingShops: Shop[] = [],
  companies: Company[] = [],
  selectedCompanyId?: string,
  selectedCompanyName?: string
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
      quantity: -1,
      value: -1,
      grossTotal: -1,
      gstin: -1,
    };

    // Locate header row containing Date and Particulars
    for (let r = 0; r < Math.min(rawRows.length, 40); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || "").trim().toLowerCase());
      const dateIdx = row.findIndex((c: string) => c === "date");
      const partIdx = row.findIndex((c: string) => c === "particulars" || c === "particular");

      if (dateIdx !== -1 && partIdx !== -1) {
        headerRowIndex = r;
        colIndex.date = dateIdx;
        colIndex.particulars = partIdx;
        colIndex.voucherType = row.findIndex(
          (c: string) =>
            c.includes("voucher type") ||
            c.includes("vch type") ||
            c === "vch type" ||
            c === "voucher type" ||
            c === "vch. type" ||
            c === "vouchertype"
        );
        colIndex.voucherNo = row.findIndex(
          (c: string) =>
            (c === "voucher no" ||
              c === "voucher no." ||
              c.startsWith("voucher no") ||
              c === "vch no" ||
              c === "vch no." ||
              c.startsWith("vch no") ||
              c === "vchno" ||
              c.includes("invoice no") ||
              c.includes("inv no")) &&
            !c.includes("ref")
        );
        colIndex.quantity = row.findIndex((c: string) => c.includes("quantity") || c === "qty");
        colIndex.value = row.findIndex(
          (c: string) =>
            c === "value" ||
            c.includes("taxable") ||
            c.includes("amount") ||
            c.includes("debit")
        );
        colIndex.grossTotal = row.findIndex(
          (c: string) =>
            c.includes("gross total") ||
            c === "gross" ||
            c.includes("total amount") ||
            c.includes("debit amount") ||
            c === "debit"
        );
        colIndex.gstin = row.findIndex((c: string) => c.includes("gstin"));
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        fileName: file.name,
        totalShops: 0,
        totalItems: 0,
        totalRows: 0,
        validRows: 0,
        warningRows: 0,
        errorRows: 0,
        collections: [],
        groupedShops: [],
        rows: [],
        headers: ["Date", "Particulars", "Voucher Type", "Voucher No", "Quantity", "Value", "Gross Total"],
        isValidFormat: false,
        message: "Could not find header row with 'Date' and 'Particulars'. Please check your spreadsheet.",
      };
    }

    const collections: ShopCollection[] = [];
    let currentShop: ShopCollection | null = null;
    let isCurrentInvoiceSkipped = false;

    const hasCompanyFilter = Boolean(
      (selectedCompanyId && selectedCompanyId !== "ALL") ||
      (selectedCompanyName &&
        selectedCompanyName !== "ALL" &&
        selectedCompanyName.toLowerCase() !== "all companies")
    );
    const filterCompId = hasCompanyFilter ? selectedCompanyId : undefined;
    const filterCompName = hasCompanyFilter ? selectedCompanyName?.trim().toLowerCase() : undefined;

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const dateCell = colIndex.date !== -1 ? String(row[colIndex.date] || "").trim() : "";
      const particularsCell = colIndex.particulars !== -1 ? String(row[colIndex.particulars] || "").trim() : "";
      const voucherTypeCell = colIndex.voucherType !== -1 ? String(row[colIndex.voucherType] || "").trim() : "";
      const voucherNoCell = colIndex.voucherNo !== -1 ? String(row[colIndex.voucherNo] || "").trim() : "";
      const quantityCell = colIndex.quantity !== -1 ? String(row[colIndex.quantity] || "").trim() : "";
      const gstinCell = colIndex.gstin !== -1 ? String(row[colIndex.gstin] || "").trim() : "";

      const valueRaw = colIndex.value !== -1 ? String(row[colIndex.value] || "").replace(/,/g, "").trim() : "0";
      const valueNum = parseFloat(valueRaw) || 0;

      const grossRaw = colIndex.grossTotal !== -1 ? String(row[colIndex.grossTotal] || "").replace(/,/g, "").trim() : "0";
      const grossNum = parseFloat(grossRaw) || 0;

      if (!particularsCell) continue;

      // Skip summary / tax / round off rows
      if (isExcludedParticulars(particularsCell)) {
        continue;
      }

      // Check if cancelled voucher
      const isCancelled =
        particularsCell.toLowerCase().includes("cancel") ||
        voucherNoCell.toLowerCase().includes("cancel") ||
        voucherTypeCell.toLowerCase().includes("cancel");

      if (isCancelled) {
        if (dateCell !== "" || voucherNoCell !== "" || voucherTypeCell !== "") {
          currentShop = null;
          isCurrentInvoiceSkipped = true;
        }
        continue;
      }

      // RULE 1: Voucher type "Retail Bill" is ignored
      const isRetailBill =
        voucherTypeCell.toLowerCase().includes("retail") ||
        voucherTypeCell.toLowerCase().includes("retail bill");

      if (isRetailBill) {
        currentShop = null;
        isCurrentInvoiceSkipped = true;
        continue;
      }

      // Detect if this is a Parent Shop Invoice Row:
      // In Sales Register, a parent row has Voucher Type or Voucher No or Date
      const isParentShopRow =
        (voucherTypeCell !== "" && voucherNoCell !== "") ||
        (voucherTypeCell !== "" && dateCell !== "") ||
        (voucherNoCell !== "" && dateCell !== "") ||
        (voucherTypeCell !== "");

      if (isParentShopRow) {
        // RULE 2: Determine company from Voucher Type
        const matched = matchCompanyByVoucherType(voucherTypeCell, companies);
        const compName = matched.companyName || voucherTypeCell;
        const compId = matched.companyId;

        // RULE 3: If a company is selected, parse ONLY that company's details & item list
        if (hasCompanyFilter) {
          const compMatches =
            (filterCompId && compId === filterCompId) ||
            (filterCompName && compName.toLowerCase() === filterCompName) ||
            (filterCompName && voucherTypeCell.toLowerCase().includes(filterCompName)) ||
            (filterCompName && filterCompName.includes(compName.toLowerCase()));

          if (!compMatches) {
            currentShop = null;
            isCurrentInvoiceSkipped = true;
            continue;
          }
        }

        // Invoice row is approved for parsing
        isCurrentInvoiceSkipped = false;

        // Match shop against registered shops master
        const shopMatch = matchExistingShop(particularsCell, existingShops, compId, compName);
        const isExisting = shopMatch ? shopMatch.matched : false;
        const canonicalName = isExisting ? shopMatch.canonicalShopName : particularsCell.trim();
        const assignedExec = isExisting ? shopMatch.assignedExecutive : undefined;

        // Total collection amount from Gross Total (falling back to Value)
        const totalAmount = grossNum > 0 ? grossNum : valueNum;

        currentShop = {
          id: `sr-${collections.length + 1}`,
          shopName: canonicalName,
          invoiceNo: voucherNoCell || `INV-${r + 1}`,
          invoiceDate: dateCell || (currentShop ? currentShop.invoiceDate : "01-Sep-26"),
          gstinUin: gstinCell || "-",
          totalAmount,
          totalQuantity: quantityCell || "",
          executiveName: assignedExec,
          companyId: compId || filterCompId,
          companyName: compName || (filterCompName ? selectedCompanyName : undefined),
          brandId: compId || filterCompId,
          brandName: compName || (filterCompName ? selectedCompanyName : undefined),
          status: assignedExec ? "mapped" : "unmapped",
          isExistingShop: isExisting,
          isNotUnique: shopMatch?.isNotUnique,
          uniquenessMessage: shopMatch?.uniquenessMessage,
          items: [],
        };
        collections.push(currentShop);
      } else if (currentShop && !isCurrentInvoiceSkipped) {
        // Child item row under the active parent shop
        currentShop.items.push({
          id: `item-${currentShop.id}-${currentShop.items.length + 1}`,
          productName: particularsCell.trim(),
          quantity: quantityCell || "1 Nos",
          amount: valueNum > 0 ? valueNum : (currentShop.items.length === 0 ? currentShop.totalAmount : 0),
          companyId: currentShop.companyId,
          companyName: currentShop.companyName,
          brandId: currentShop.brandId,
          brandName: currentShop.brandName,
        });
      }
    }

    // Post-calculation: If total amount was 0, calculate sum of child items
    for (const shop of collections) {
      if (shop.totalAmount === 0 && shop.items.length > 0) {
        shop.totalAmount = shop.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      }
      if (!shop.totalQuantity && shop.items.length > 0) {
        const totalQtyNum = shop.items.reduce((acc, it) => {
          const n = parseFloat(String(it.quantity).replace(/[^0-9.]/g, ""));
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
        if (totalQtyNum > 0) {
          shop.totalQuantity = `${totalQtyNum} NO`;
        }
      }
    }

    const flatRows = flattenCollectionsToRows(collections);
    const totalItemsCount = collections.reduce((acc, c) => acc + c.items.length, 0);

    return {
      fileName: file.name,
      totalShops: collections.length,
      totalItems: totalItemsCount,
      totalRows: flatRows.length,
      validRows: collections.filter((r) => Boolean(r.executiveName) && r.status === "mapped").length,
      warningRows: collections.filter((r) => !r.executiveName || r.status === "unmapped").length,
      errorRows: 0,
      collections,
      groupedShops: collections,
      rows: flatRows,
      headers: ["Shop Name", "Voucher Type / Company", "Invoice No", "Quantity", "Total Gross Amount", "Items"],
      isValidFormat: true,
      message: `Parsed ${collections.length} shops from Sales Register (${hasCompanyFilter ? selectedCompanyName : "All Companies"}).`,
    };
  } catch (err: any) {
    console.error("Sales Register parse error:", err);
    throw err;
  }
}

export interface ExtractedExcelShopsResult {
  fileName: string;
  sheetNames: string[];
  targetCol: number;
  columns: { index: number; name: string; sample: string[] }[];
  shops: string[];
  rawRows: any[][];
  detectedExecutive?: string;
}

export function extractShopsFromRawRows(
  rows: any[][],
  colIdx: number = -1,
  executives?: { name: string }[]
): {
  targetCol: number;
  columns: { index: number; name: string; sample: string[] }[];
  shops: string[];
  detectedExecutive?: string;
} {
  if (!rows || rows.length === 0) return { targetCol: 0, columns: [], shops: [] };

  let headerRowIndex = -1;
  let particularsColIndex = -1;
  const colScores: Record<number, number> = {};

  // 1. Scan up to first 60 rows to locate the "Particulars" column and header row
  for (let r = 0; r < Math.min(rows.length, 60); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const raw = String(row[c] || "").trim();
      if (!raw) continue;
      const clean = raw.toLowerCase().replace(/[:]/g, "").trim();

      // Highest priority: "Particulars" / "Particular"
      if (clean === "particulars" || clean === "particular" || clean.startsWith("particular")) {
        particularsColIndex = c;
        headerRowIndex = r;
        colScores[c] = (colScores[c] || 0) + 1000;
        break;
      } else if (
        clean === "shop name" ||
        clean === "shop" ||
        clean === "store name" ||
        clean === "store"
      ) {
        colScores[c] = (colScores[c] || 0) + 200;
        if (headerRowIndex === -1) headerRowIndex = r;
      } else if (
        clean === "party name" ||
        clean === "customer" ||
        clean === "party" ||
        clean === "customer name" ||
        clean === "party's name"
      ) {
        colScores[c] = (colScores[c] || 0) + 150;
        if (headerRowIndex === -1) headerRowIndex = r;
      } else if (
        clean === "name" ||
        clean === "account" ||
        clean === "account name" ||
        clean === "ledger"
      ) {
        colScores[c] = (colScores[c] || 0) + 50;
        if (headerRowIndex === -1) headerRowIndex = r;
      }
    }

    if (particularsColIndex !== -1) {
      break; // Found exact "Particulars" header row
    }
  }

  // Calculate maximum column count across the header and data preview
  const maxCols = Math.max(
    ...rows.slice(0, Math.min(rows.length, 60)).map((r) => (Array.isArray(r) ? r.length : 0)),
    1
  );

  const headerRow = headerRowIndex !== -1 && Array.isArray(rows[headerRowIndex]) ? rows[headerRowIndex] : [];

  const columns: { index: number; name: string; sample: string[] }[] = [];
  for (let c = 0; c < maxCols; c++) {
    let colName = String(headerRow[c] || "").trim();
    if (!colName && headerRowIndex > 0 && Array.isArray(rows[headerRowIndex - 1])) {
      colName = String(rows[headerRowIndex - 1][c] || "").trim();
    }
    if (!colName) {
      colName = `Column ${String.fromCharCode(65 + c)}`;
    }

    const sample = rows
      .slice(headerRowIndex + 1, headerRowIndex + 5)
      .map((r) => String(r[c] || "").trim())
      .filter(Boolean);
    columns.push({ index: c, name: colName, sample });
  }

  let targetCol = colIdx;
  if (targetCol === -1 || targetCol >= maxCols) {
    if (particularsColIndex !== -1) {
      targetCol = particularsColIndex;
    } else {
      let bestScore = -1;
      for (const [c, score] of Object.entries(colScores)) {
        if (score > bestScore) {
          bestScore = score;
          targetCol = Number(c);
        }
      }
      if (targetCol === -1) targetCol = 0;
    }
  }

  // 2. Detect executive name from metadata rows above the "Particulars" header
  let detectedExecutive: string | undefined;
  if (executives && executives.length > 0 && headerRowIndex > 0) {
    for (let r = 0; r < headerRowIndex; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const text = String(row[c] || "").trim().toLowerCase();
        if (!text) continue;
        const matched = executives.find((e) => {
          const eName = e.name.trim().toLowerCase();
          return text === eName || text.includes(eName) || eName.includes(text);
        });
        if (matched) {
          detectedExecutive = matched.name;
          break;
        }
      }
      if (detectedExecutive) break;
    }
  }

  const invalidKeywords = [
    "total",
    "grand total",
    "sub total",
    "subtotal",
    "opening",
    "closing",
    "opening balance",
    "closing balance",
    "cancel",
    "cancelled",
    "void",
    "delete",
    "sales account",
    "purchase account",
    "date",
    "particulars",
    "particular",
    "debit",
    "credit",
    "pending bills",
    "group outstandings",
    "outstandings",
    "gstin",
    "vch",
    "voucher",
    "party name",
    "shop name",
    "customer name",
    "on account",
    "dr",
    "cr",
    "balance",
    "net balance",
    "due date",
    "overdue",
    "na",
    "n/a",
    "nil",
    "none",
  ];

  const shops: string[] = [];
  const seen = new Set<string>();
  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const rawCell = String(row[targetCol] || "").trim();
    const cell = rawCell.replace(/\s+/g, " ");
    if (!cell || cell.length < 2) continue;
    const lower = cell.toLowerCase();

    // Skip summary / header / metadata keywords
    if (
      invalidKeywords.some(
        (inv) =>
          lower === inv ||
          lower.startsWith(inv + " ") ||
          lower.startsWith(inv + ":") ||
          lower.endsWith(" " + inv)
      )
    ) {
      continue;
    }

    if (lower.startsWith("total")) continue;

    // Skip numeric values or currency amounts
    if (!isNaN(Number(cell.replace(/,/g, "")))) continue;

    if (!seen.has(lower)) {
      seen.add(lower);
      shops.push(cell);
    }
  }

  return { targetCol, columns, shops, detectedExecutive };
}

export async function extractShopNamesFromExcel(
  file: File,
  targetColumnIndex?: number,
  executives?: { name: string }[]
): Promise<ExtractedExcelShopsResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const parsed = extractShopsFromRawRows(rawRows, targetColumnIndex ?? -1, executives);

  return {
    fileName: file.name,
    sheetNames: workbook.SheetNames,
    targetCol: parsed.targetCol,
    columns: parsed.columns,
    shops: parsed.shops,
    rawRows,
    detectedExecutive: parsed.detectedExecutive,
  };
}
