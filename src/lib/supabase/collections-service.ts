
import { createClient, isSupabaseConfigured } from "./client";
import { ShopCollection, Executive, Shop, ShopMapping, Company } from "@/types";
import { signUpExecutiveWithSupabase, getStoredExecutiveCredentials, removeExecutiveCredential } from "@/lib/auth-service";
import { saveExecutiveCompanies, removeStoredExecutiveCompanies, getStoredExecutiveCompaniesMap } from "@/lib/executive-utils";

export function isCancelledOrInvalidShop(name: string): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  return (
    clean === "" ||
    clean === "-" ||
    clean === "na" ||
    clean === "n/a" ||
    clean === "nil" ||
    clean === "none" ||
    clean.includes("cancel") ||
    clean.includes("void") ||
    clean.includes("delete") ||
    clean.includes("rejected")
  );
}

/**
 * Asynchronously deletes any shop or collection records matching '%cancel%' from Supabase
 */
async function cleanupCancelledShopsFromDb(supabase: any) {
  try {
    await supabase.from("shops").delete().ilike("name", "%cancel%");
    await supabase.from("shops").delete().ilike("name", "%void%");
    await supabase.from("shop_collections").delete().ilike("shop_name", "%cancel%");
    await supabase.from("shop_collections").delete().ilike("shop_name", "%void%");
  } catch (err) {
    // Silent background cleanup
  }
}

/**
 * Saves a batch of parsed parent-child shop collections into Supabase
 */
export async function saveParsedCollectionsToDb(
  fileName: string,
  collections: ShopCollection[],
  companyId?: string,
  companyName?: string
): Promise<{
  success: boolean;
  batchId?: string;
  error?: string;
  savedCount?: number;
  skippedDuplicatesCount?: number;
  message?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured. Please check your Supabase credentials in .env.local" };
  }

  const supabase = createClient();
  if (!supabase) return { success: false, error: "Failed to initialize Supabase client" };

  try {
    const validCollections = collections.filter(
      (c) => !isCancelledOrInvalidShop(c.shopName)
    );

    // 0. DUPLICATE VOUCHER CHECK:
    // Collect all voucher / invoice numbers from validCollections to check against existing DB records
    const invoiceNosToCheck = Array.from(
      new Set(
        validCollections
          .map((c) => c.invoiceNo?.trim())
          .filter((v): v is string => Boolean(v && v !== "-"))
      )
    );

    const existingInvoicesInDb = new Set<string>();

    for (let i = 0; i < invoiceNosToCheck.length; i += 200) {
      const chunk = invoiceNosToCheck.slice(i, i + 200);
      const { data: existingRows } = await supabase
        .from("shop_collections")
        .select("invoice_no")
        .in("invoice_no", chunk);

      if (existingRows) {
        for (const row of existingRows) {
          if (row.invoice_no) {
            existingInvoicesInDb.add(row.invoice_no.trim().toLowerCase());
          }
        }
      }
    }

    // Filter out collections whose voucher numbers already exist in DB or are duplicated within this batch
    const seenInBatch = new Set<string>();
    const collectionsToInsert: ShopCollection[] = [];
    let skippedDuplicatesCount = 0;

    for (const shop of validCollections) {
      const normInv = shop.invoiceNo?.trim().toLowerCase();
      if (normInv && normInv !== "-") {
        if (existingInvoicesInDb.has(normInv)) {
          console.warn(`[Deduplication] Voucher "${shop.invoiceNo}" already exists in database. Cannot be added again.`);
          skippedDuplicatesCount++;
          continue;
        }
        if (seenInBatch.has(normInv)) {
          console.warn(`[Deduplication] Voucher "${shop.invoiceNo}" duplicate within current upload. Cannot be added again.`);
          skippedDuplicatesCount++;
          continue;
        }
        seenInBatch.add(normInv);
      }
      collectionsToInsert.push(shop);
    }

    // If ALL collections in this file are duplicates, block insertion
    if (collectionsToInsert.length === 0) {
      return {
        success: false,
        error: `All ${validCollections.length} voucher(s) in this file have already been added previously. Duplicates cannot be added again.`,
        skippedDuplicatesCount,
        savedCount: 0,
      };
    }

    const totalItems = collectionsToInsert.reduce((acc, c) => acc + c.items.length, 0);

    // Guard against rapid duplicate clicks (within 60 seconds for the same filename and item count)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentDup } = await supabase
      .from("upload_batches")
      .select("id")
      .eq("file_name", fileName)
      .eq("total_items", totalItems)
      .gte("uploaded_at", sixtySecondsAgo)
      .maybeSingle();

    if (recentDup) {
      console.warn("Duplicate batch submission blocked for file:", fileName);
      return {
        success: false,
        error: `"${fileName}" was already processed seconds ago. Duplicate submission prevented.`,
      };
    }

    // 1. Create Upload Batch Record (stores company_id and brand_id)
    let batch: any = null;
    let batchError: any = null;

    const fullBatchPayload = {
      file_name: fileName,
      company_id: companyId || null,
      company_name: companyName || null,
      brand_id: companyId || null,
      brand_name: companyName || null,
      total_shops: collectionsToInsert.length,
      total_items: totalItems,
    };

    const resBatch = await supabase
      .from("upload_batches")
      .insert(fullBatchPayload)
      .select("id")
      .single();

    if (
      resBatch.error &&
      (resBatch.error.message?.includes("brand_id") || resBatch.error.message?.includes("brand_name"))
    ) {
      // Fallback if brand_id not yet migrated in remote Supabase
      const fallbackBatch = await supabase
        .from("upload_batches")
        .insert({
          file_name: fileName,
          company_id: companyId || null,
          company_name: companyName || null,
          total_shops: collectionsToInsert.length,
          total_items: totalItems,
        })
        .select("id")
        .single();
      batch = fallbackBatch.data;
      batchError = fallbackBatch.error;
    } else {
      batch = resBatch.data;
      batchError = resBatch.error;
    }

    if (batchError || !batch) {
      console.error("Error creating upload batch:", batchError);
      return { success: false, error: batchError?.message || "Failed to create upload batch" };
    }

    const batchId = batch.id;

    // Fetch all executives to resolve executive IDs when persisting mappings
    const { data: allExecs } = await supabase.from("executives").select("id, name");

    // 2. Process each non-duplicate parent shop collection:
    // Ensure all shops exist in `shops` table and `shop_mappings`
    for (const shop of collectionsToInsert) {
      const cleanShopName = shop.shopName.trim();
      if (isCancelledOrInvalidShop(cleanShopName)) {
        continue;
      }
      let assignedExecName = shop.executiveName;

      // Check if shop exists in `shops` master
      const { data: existingShop } = await supabase
        .from("shops")
        .select("id, name")
        .ilike("name", cleanShopName)
        .maybeSingle();

      let shopId: string;

      const isFiltered = Boolean(companyName && companyName !== "Sales Register (Multi-Company)" && companyId && companyId !== "ALL");
      const effectiveCompName = (isFiltered ? companyName : (shop.companyName || (companyName !== "Sales Register (Multi-Company)" ? companyName : null))) || null;
      const effectiveCompId = (isFiltered ? companyId : (shop.companyId || (companyId !== "ALL" ? companyId : null))) || null;

      // Resolve executive ID if assignedExecName is provided
      let resolvedExecId: string | null = null;
      if (assignedExecName && allExecs) {
        const foundExec = allExecs.find(
          (e) => e.name.trim().toLowerCase() === assignedExecName?.trim().toLowerCase()
        );
        if (foundExec) resolvedExecId = foundExec.id;
      }

      if (!existingShop) {
        // A. NEW SHOP: Insert into `shops` table with company / brand tag
        const shopPayload = {
          name: cleanShopName,
          company_id: effectiveCompId,
          company_name: effectiveCompName,
          brand_id: effectiveCompId,
          brand_name: effectiveCompName,
        };
        let newShopRes = await supabase
          .from("shops")
          .insert(shopPayload)
          .select("id, name")
          .single();

        if (
          newShopRes.error &&
          (newShopRes.error.message?.includes("brand") || newShopRes.error.message?.includes("company"))
        ) {
          newShopRes = await supabase
            .from("shops")
            .insert({ name: cleanShopName })
            .select("id, name")
            .single();
        }

        if (newShopRes.error || !newShopRes.data) {
          console.error("Error creating new shop from Excel:", newShopRes.error);
          // Fallback fetch in case of concurrent insert
          const { data: fallbackShop } = await supabase
            .from("shops")
            .select("id, name")
            .ilike("name", cleanShopName)
            .maybeSingle();
          shopId = fallbackShop?.id || "";
        } else {
          shopId = newShopRes.data.id;
        }

        // B. Add new shop into `shop_mappings` with assigned executive if known
        if (shopId) {
          const mapPayload: any = {
            shop_id: shopId,
            executive_id: resolvedExecId || null,
            company_id: effectiveCompId,
            company_name: effectiveCompName,
            brand_id: effectiveCompId,
            brand_name: effectiveCompName,
          };
          await supabase.from("shop_mappings").insert(mapPayload);
        }
      } else {
        shopId = existingShop.id;

        // C. ALREADY REGISTERED SHOP:
        // Check if this shop already has an executive mapping in `shop_mappings` matching company/brand
        const { data: mappingRows } = await supabase
          .from("shop_mappings")
          .select("id, executive_id, company_id, brand_id, company_name, brand_name, executives:executive_id (name)")
          .eq("shop_id", shopId);

        let mappingData: any = null;
        if (mappingRows && mappingRows.length > 0) {
          if (effectiveCompId) {
            mappingData = mappingRows.find(
              (m) => m.company_id === effectiveCompId || m.brand_id === effectiveCompId
            );
          }
          if (!mappingData && effectiveCompName) {
            mappingData = mappingRows.find(
              (m) =>
                m.company_name?.trim().toLowerCase() === effectiveCompName.trim().toLowerCase() ||
                m.brand_name?.trim().toLowerCase() === effectiveCompName.trim().toLowerCase()
            );
          }
          if (!mappingData && !effectiveCompId && !effectiveCompName) {
            mappingData = mappingRows[0];
          }
        }

        const mappedExec = (mappingData?.executives as any)?.name;
        if (mappedExec) {
          // If already mapped shop, route collection directly to that executive
          assignedExecName = mappedExec;
        } else if (mappingData) {
          // If mapping exists but has no executive, and we have an executive from the preview, update it!
          if (!mappingData.executive_id && resolvedExecId) {
            await supabase
              .from("shop_mappings")
              .update({ executive_id: resolvedExecId })
              .eq("id", mappingData.id);
          }
        } else {
          // Ensure mapping record exists with resolved executive or unmapped
          const mapPayload: any = {
            shop_id: shopId,
            executive_id: resolvedExecId || null,
            company_id: effectiveCompId,
            company_name: effectiveCompName,
            brand_id: effectiveCompId,
            brand_name: effectiveCompName,
          };
          await supabase.from("shop_mappings").insert(mapPayload);
        }
      }

      // D. Insert into `shop_collections` (stores both company_id & brand_id)
      const shopColPayload: any = {
        shop_name: cleanShopName,
        invoice_no: shop.invoiceNo,
        invoice_date: shop.invoiceDate,
        gstin_uin: shop.gstinUin,
        total_amount: shop.totalAmount,
        total_quantity: shop.totalQuantity ? String(shop.totalQuantity) : null,
        executive_name: assignedExecName || null,
        company_id: effectiveCompId,
        company_name: effectiveCompName,
        brand_id: effectiveCompId,
        brand_name: effectiveCompName,
        upload_batch_id: batchId,
      };

      let parentShopRes = await supabase
        .from("shop_collections")
        .insert(shopColPayload)
        .select("id")
        .single();

      if (
        parentShopRes.error &&
        (parentShopRes.error.message?.includes("brand_id") ||
          parentShopRes.error.message?.includes("brand_name"))
      ) {
        parentShopRes = await supabase
          .from("shop_collections")
          .insert({
            shop_name: cleanShopName,
            invoice_no: shop.invoiceNo,
            invoice_date: shop.invoiceDate,
            gstin_uin: shop.gstinUin,
            total_amount: shop.totalAmount,
            total_quantity: shop.totalQuantity ? String(shop.totalQuantity) : null,
            executive_name: assignedExecName || null,
            company_id: effectiveCompId,
            company_name: effectiveCompName,
            upload_batch_id: batchId,
          })
          .select("id")
          .single();
      }

      if (parentShopRes.error || !parentShopRes.data) {
        console.error(`Error saving shop collection for ${cleanShopName}:`, parentShopRes.error);
        continue;
      }

      const parentShop = parentShopRes.data;

      // E. Insert child items for this parent shop (stores company_id & brand_id)
      if (shop.items && shop.items.length > 0) {
        const itemRows = shop.items.map((item) => ({
          shop_collection_id: parentShop.id,
          product_name: item.productName,
          quantity: String(item.quantity || "1 Nos"),
          amount: Number(item.amount) || 0,
          company_id: item.companyId || effectiveCompId,
          company_name: item.companyName || effectiveCompName,
          brand_id: item.companyId || effectiveCompId,
          brand_name: item.companyName || effectiveCompName,
        }));

        let itemsRes = await supabase
          .from("collection_items")
          .insert(itemRows);

        if (
          itemsRes.error &&
          (itemsRes.error.message?.includes("brand") || itemsRes.error.message?.includes("company"))
        ) {
          // Graceful fallback if collection_items hasn't been migrated with company_id/brand_id yet
          const fallbackItemRows = shop.items.map((item) => ({
            shop_collection_id: parentShop.id,
            product_name: item.productName,
            quantity: String(item.quantity || "1 Nos"),
            amount: Number(item.amount) || 0,
          }));
          itemsRes = await supabase.from("collection_items").insert(fallbackItemRows);
        }

        if (itemsRes.error) {
          console.error(`Error saving items for ${cleanShopName}:`, itemsRes.error);
        }
      }
    }

    return {
      success: true,
      batchId,
      savedCount: collectionsToInsert.length,
      skippedDuplicatesCount,
      message: skippedDuplicatesCount > 0
        ? `Successfully saved ${collectionsToInsert.length} collections. ${skippedDuplicatesCount} duplicate voucher(s) were skipped and not added again.`
        : undefined,
    };
  } catch (err: any) {
    console.error("Database save exception:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Fetch all shop collections with nested child items
 */
export async function getShopCollections(): Promise<ShopCollection[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shop_collections")
    .select(`
      id,
      shop_name,
      invoice_no,
      invoice_date,
      gstin_uin,
      total_amount,
      total_quantity,
      executive_name,
      company_id,
      company_name,
      created_at,
      collection_items (
        id,
        product_name,
        quantity,
        amount
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching shop collections:", error);
    return [];
  }

  const paidMap = getLocalPaymentStatusMap();

  return data
    .filter((row: any) => !isCancelledOrInvalidShop(row.shop_name))
    .map((row: any) => {
      const rawItems = row.collection_items || [];
      const hasPaidMarker = rawItems.some((item: any) => item.product_name === "__PAID__");
      const isPaid =
        typeof paidMap[row.id] === "boolean"
          ? paidMap[row.id]
          : hasPaidMarker || Boolean(row.is_paid);
      const displayItems = rawItems.filter((item: any) => item.product_name !== "__PAID__");

      return {
        id: row.id,
        shopName: row.shop_name,
        invoiceNo: row.invoice_no,
        invoiceDate: row.invoice_date || "",
        gstinUin: row.gstin_uin || "",
        totalAmount: Number(row.total_amount) || 0,
        totalQuantity: row.total_quantity,
        executiveName: row.executive_name,
        companyId: row.company_id || row.brand_id,
        companyName: row.company_name || row.brand_name,
        brandId: row.brand_id || row.company_id,
        brandName: row.brand_name || row.company_name,
        status: row.executive_name ? "mapped" : "unmapped",
        isPaid,
        items: displayItems.map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          quantity: item.quantity,
          amount: Number(item.amount) || 0,
          companyId: item.company_id || row.company_id || row.brand_id,
          companyName: item.company_name || row.company_name || row.brand_name,
          brandId: item.brand_id || item.company_id || row.brand_id || row.company_id,
          brandName: item.brand_name || item.company_name || row.brand_name || row.company_name,
        })),
      };
    });
}

/**
 * Get map of paid invoice IDs from localStorage
 */
export function getLocalPaymentStatusMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("collecto_paid_invoices");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Toggle payment status for an invoice (Reversible: Paid <-> Unpaid)
 */
export async function toggleInvoicePaymentStatus(
  invoiceId: string,
  isPaid: boolean
): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const current = getLocalPaymentStatusMap();
      current[invoiceId] = isPaid;
      localStorage.setItem("collecto_paid_invoices", JSON.stringify(current));
    } catch (e) {
      console.warn("Failed to persist payment status:", e);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        if (isPaid) {
          const { data: existing } = await supabase
            .from("collection_items")
            .select("id")
            .eq("shop_collection_id", invoiceId)
            .eq("product_name", "__PAID__")
            .maybeSingle();

          if (!existing) {
            await supabase.from("collection_items").insert({
              shop_collection_id: invoiceId,
              product_name: "__PAID__",
              quantity: "1",
              amount: 0,
            });
          }
        } else {
          await supabase
            .from("collection_items")
            .delete()
            .eq("shop_collection_id", invoiceId)
            .eq("product_name", "__PAID__");
        }

        await supabase
          .from("shop_collections")
          .update({ is_paid: isPaid } as any)
          .eq("id", invoiceId);
      }
    } catch {
      // Ignored if column or operation fails
    }
  }

  return true;
}


/**
 * Fetch collections for a specific executive
 */
export async function getExecutiveCollections(executiveName: string): Promise<ShopCollection[]> {
  const all = await getShopCollections();
  return all.filter((s) => s.executiveName?.toLowerCase() === executiveName.toLowerCase());
}

/**
 * Fetch list of executives
 */
export async function getExecutives(): Promise<Executive[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("executives").select("id, name").order("name");
  if (error || !data) return [];

  const credsCache = getStoredExecutiveCredentials();

  return data.map((exec) => {
    const key = exec.name.trim().toLowerCase();
    const cached = credsCache[key];
    const defaultUsername = exec.name.toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");

    return {
      id: exec.id,
      name: exec.name,
      username: cached?.username || defaultUsername,
      password: cached?.password || "password123",
      companies: getStoredExecutiveCompaniesMap()[key] || [],
    };
  });
}

/**
 * Fetch list of shops
 */
export async function getShops(): Promise<Shop[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  // Trigger background cleanup of any cancelled records
  cleanupCancelledShopsFromDb(supabase);

  const { data, error } = await supabase
    .from("shops")
    .select(`
      id,
      name,
      company_id,
      company_name,
      brand_id,
      brand_name,
      shop_mappings (
        id,
        executive_id,
        company_id,
        company_name,
        brand_id,
        brand_name,
        executives:executive_id (name)
      )
    `)
    .order("name");

  if (error || !data) {
    console.error("Error fetching shops:", error);
    return [];
  }

  // Fetch company tags from shop_collections to automatically link brands to shops
  const { data: shopCols } = await supabase
    .from("shop_collections")
    .select("shop_name, company_id, company_name, brand_id, brand_name");

  const shopCompanyMap: Record<string, { id?: string; name?: string }> = {};
  if (shopCols) {
    for (const sc of shopCols) {
      const key = (sc.shop_name || "").trim().toLowerCase();
      if ((sc.company_name || sc.brand_name) && !shopCompanyMap[key]) {
        shopCompanyMap[key] = {
          id: sc.company_id || sc.brand_id,
          name: sc.company_name || sc.brand_name,
        };
      }
    }
  }

  const result: Shop[] = [];
  for (const s of data) {
    if (isCancelledOrInvalidShop(s.name)) continue;

    const compFromCol = shopCompanyMap[s.name.trim().toLowerCase()];

    const mappings = Array.isArray(s.shop_mappings)
      ? s.shop_mappings
      : s.shop_mappings
      ? [s.shop_mappings]
      : [];

    if (mappings.length === 0) {
      const compId = s.company_id || s.brand_id || compFromCol?.id;
      const compName = s.company_name || s.brand_name || compFromCol?.name;
      result.push({
        id: s.id,
        name: s.name,
        companyId: compId || undefined,
        companyName: compName || undefined,
        brandId: compId || undefined,
        brandName: compName || undefined,
      });
    } else {
      const compFromCol = shopCompanyMap[s.name.trim().toLowerCase()];
      const seenCompanies = new Map<string, { m: any; execName?: string; compId?: string; compName?: string }>();
      const duplicateIdsToDelete: string[] = [];

      for (const m of mappings) {
        const execName = Array.isArray(m.executives)
          ? m.executives[0]?.name
          : (m.executives as any)?.name;
        const compId = m.company_id || m.brand_id || s.company_id || s.brand_id || compFromCol?.id;
        const compName = m.company_name || m.brand_name || s.company_name || s.brand_name || compFromCol?.name;
        const normKey = (compName || compId || "general").trim().toLowerCase();

        if (!seenCompanies.has(normKey)) {
          seenCompanies.set(normKey, { m, execName, compId, compName });
        } else {
          const existing = seenCompanies.get(normKey)!;
          if (!existing.execName && execName) {
            if (existing.m?.id) duplicateIdsToDelete.push(existing.m.id);
            seenCompanies.set(normKey, { m, execName, compId, compName });
          } else {
            if (m?.id) duplicateIdsToDelete.push(m.id);
          }
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        supabase.from("shop_mappings").delete().in("id", duplicateIdsToDelete).then(() => {});
      }

      for (const [_, item] of seenCompanies) {
        result.push({
          id: s.id,
          mappingId: item.m.id,
          name: s.name,
          assignedExecutiveName: item.execName || undefined,
          companyId: item.compId || undefined,
          companyName: item.compName || undefined,
          brandId: item.compId || undefined,
          brandName: item.compName || undefined,
        });
      }
    }
  }
  return result;
}

/**
 * Fetch shop to executive mappings (all registered shops left-joined with mappings)
 */
export async function getShopMappings(): Promise<ShopMapping[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  // 1. Fetch registered shops with their mapped executives
  const { data, error } = await supabase
    .from("shops")
    .select(`
      id,
      name,
      company_id,
      company_name,
      brand_id,
      brand_name,
      shop_mappings (
        id,
        executive_id,
        company_id,
        company_name,
        brand_id,
        brand_name,
        executives:executive_id (name)
      )
    `)
    .order("name");

  if (error || !data) return [];

  // 2. Fetch company tags from shop_collections to automatically link brands to shops
  const { data: shopCols } = await supabase
    .from("shop_collections")
    .select("shop_name, company_id, company_name, brand_id, brand_name");

  const shopCompanyMap: Record<string, { id?: string; name?: string }> = {};
  if (shopCols) {
    for (const sc of shopCols) {
      const key = (sc.shop_name || "").trim().toLowerCase();
      if ((sc.company_name || sc.brand_name) && !shopCompanyMap[key]) {
        shopCompanyMap[key] = {
          id: sc.company_id || sc.brand_id,
          name: sc.company_name || sc.brand_name,
        };
      }
    }
  }

  const results: ShopMapping[] = [];
  for (const shop of data) {
    if (isCancelledOrInvalidShop(shop.name)) continue;

    const mappings = Array.isArray(shop.shop_mappings)
      ? shop.shop_mappings
      : shop.shop_mappings
      ? [shop.shop_mappings]
      : [];

    if (mappings.length === 0) {
      const compFromCol = shopCompanyMap[shop.name.trim().toLowerCase()];
      const companyId = shop.company_id || shop.brand_id || compFromCol?.id;
      const companyName = shop.company_name || shop.brand_name || compFromCol?.name;
      results.push({
        id: `map-${shop.id}`,
        shopId: shop.id,
        shopName: shop.name,
        companyId: companyId || undefined,
        companyName: companyName || undefined,
        brandId: companyId || undefined,
        brandName: companyName || undefined,
        status: "unmapped",
      });
    } else {
      const compFromCol = shopCompanyMap[shop.name.trim().toLowerCase()];
      const seenCompanies = new Map<string, { mapping: any; execName?: string; companyId?: string; companyName?: string }>();
      const duplicateIdsToDelete: string[] = [];

      for (const mapping of mappings) {
        const execName = Array.isArray(mapping?.executives)
          ? mapping.executives[0]?.name
          : (mapping?.executives as any)?.name;
        const companyId =
          mapping?.company_id ||
          mapping?.brand_id ||
          shop.company_id ||
          shop.brand_id ||
          compFromCol?.id;
        const companyName =
          mapping?.company_name ||
          mapping?.brand_name ||
          shop.company_name ||
          shop.brand_name ||
          compFromCol?.name;

        const normKey = (companyName || companyId || "general").trim().toLowerCase();

        if (!seenCompanies.has(normKey)) {
          seenCompanies.set(normKey, { mapping, execName, companyId, companyName });
        } else {
          const existing = seenCompanies.get(normKey)!;
          if (!existing.execName && execName) {
            if (existing.mapping?.id) duplicateIdsToDelete.push(existing.mapping.id);
            seenCompanies.set(normKey, { mapping, execName, companyId, companyName });
          } else {
            if (mapping?.id) duplicateIdsToDelete.push(mapping.id);
          }
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        supabase.from("shop_mappings").delete().in("id", duplicateIdsToDelete).then(() => {});
      }

      for (const [_, item] of seenCompanies) {
        results.push({
          id: item.mapping.id || `map-${shop.id}-${item.companyId || "default"}`,
          shopId: shop.id,
          shopName: shop.name,
          executiveId: item.mapping?.executive_id || undefined,
          executiveName: item.execName || undefined,
          companyId: item.companyId || undefined,
          companyName: item.companyName || undefined,
          brandId: item.companyId || undefined,
          brandName: item.companyName || undefined,
          status: item.execName ? ("mapped" as const) : ("unmapped" as const),
        });
      }
    }
  }

  return results;
}

/**
 * Add a single shop and optionally map to an executive and company
 */
export async function addShopWithExecutive(
  shopName: string,
  executiveName?: string,
  companyId?: string,
  companyName?: string
): Promise<{ success: boolean; shop?: Shop; error?: string }> {
  const cleanName = shopName.trim();
  if (!cleanName) return { success: false, error: "Shop name cannot be empty" };

  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured" };
  }

  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client not initialized" };

  // 1. Check if an existing shop with this name AND this company exists
  let shopData: any = null;
  let findQuery = supabase
    .from("shops")
    .select("id, name, company_id, company_name, brand_id, brand_name")
    .ilike("name", cleanName);

  if (companyId) {
    findQuery = findQuery.or(`company_id.eq.${companyId},brand_id.eq.${companyId}`);
  }

  const { data: matchedShops } = await findQuery;
  if (matchedShops && matchedShops.length > 0) {
    shopData = matchedShops[0];
  } else {
    // If not found, try inserting new shop row (or fallback upsert if shops_name_key is still present)
    const insertPayload: any = { name: cleanName };
    if (companyId || companyName) {
      insertPayload.company_id = companyId || null;
      insertPayload.company_name = companyName || null;
      insertPayload.brand_id = companyId || null;
      insertPayload.brand_name = companyName || null;
    }

    const insRes = await supabase
      .from("shops")
      .insert(insertPayload)
      .select("id, name, company_id, company_name")
      .maybeSingle();

    if (insRes.data) {
      shopData = insRes.data;
    } else {
      // Fallback: legacy unique on name, find or update
      const { data: fallbackShop } = await supabase
        .from("shops")
        .select("id, name, company_id, company_name")
        .ilike("name", cleanName)
        .maybeSingle();

      if (fallbackShop) {
        shopData = fallbackShop;
        if (companyId || companyName) {
          await supabase
            .from("shops")
            .update({
              company_id: companyId || null,
              company_name: companyName || null,
              brand_id: companyId || null,
              brand_name: companyName || null,
            })
            .eq("id", fallbackShop.id);
        }
      } else {
        return { success: false, error: insRes.error?.message || "Failed to create shop" };
      }
    }
  }

  if (!shopData) {
    return { success: false, error: "Failed to create or locate shop" };
  }

  // 2. Insert or update mapping with company tag
  let execId: string | null = null;
  const cleanExec = executiveName?.trim();
  if (cleanExec && cleanExec !== "-- Unassigned --") {
    let { data: execData } = await supabase
      .from("executives")
      .select("id, name")
      .ilike("name", cleanExec)
      .maybeSingle();

    if (!execData) {
      const { data: allExecs } = await supabase.from("executives").select("id, name");
      if (allExecs) {
        const found = allExecs.find(
          (e) => e.name.trim().toLowerCase() === cleanExec.toLowerCase()
        );
        if (found) execData = found;
      }
    }

    if (execData) {
      execId = execData.id;
    }
  }

  const mapPayload: any = {
    shop_id: shopData.id,
    executive_id: execId,
    company_id: companyId || null,
    company_name: companyName || null,
    brand_id: companyId || null,
    brand_name: companyName || null,
  };

  // Upsert mapping: first check if a mapping already exists for this shop (and company)
  let existingMapQuery = supabase
    .from("shop_mappings")
    .select("id")
    .eq("shop_id", shopData.id);

  if (companyId) {
    existingMapQuery = existingMapQuery.or(`company_id.eq.${companyId},brand_id.eq.${companyId}`);
  }

  const { data: existingMaps } = await existingMapQuery;
  if (existingMaps && existingMaps.length > 0) {
    await supabase
      .from("shop_mappings")
      .update(mapPayload)
      .eq("id", existingMaps[0].id);
  } else {
    const mapIns = await supabase.from("shop_mappings").insert(mapPayload);
    if (mapIns.error) {
      // Fallback: update on shop_id if unique constraint on shop_id is present
      await supabase.from("shop_mappings").upsert(mapPayload, { onConflict: "shop_id" });
    }
  }

  // 3. If executive was assigned, also cascade update to any existing collections for this company
  if (cleanExec && execId) {
    let colUpdateQuery = supabase
      .from("shop_collections")
      .update({ executive_name: cleanExec })
      .ilike("shop_name", cleanName);

    if (companyId) {
      colUpdateQuery = colUpdateQuery.or(`company_id.eq.${companyId},brand_id.eq.${companyId}`);
    }
    await colUpdateQuery;
  }

  return {
    success: true,
    shop: {
      id: shopData.id,
      name: shopData.name,
      assignedExecutiveName: execId ? cleanExec : undefined,
      companyId: companyId || undefined,
      companyName: companyName || undefined,
    },
  };
}

/**
 * Bulk add multiple shops at once with optional executive and company assignment
 */
export async function bulkAddShopsWithExecutive(
  shopNames: string[],
  executiveName?: string,
  companyId?: string,
  companyName?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const cleanNames = Array.from(
    new Set(shopNames.map((n) => n.trim()).filter((n) => n.length > 0))
  );
  if (cleanNames.length === 0) return { success: false, count: 0, error: "No valid shop names provided" };

  if (!isSupabaseConfigured()) {
    return { success: false, count: 0, error: "Database not configured" };
  }
  const supabase = createClient();
  if (!supabase) return { success: false, count: 0, error: "Supabase client not initialized" };

  try {
    // 1. Resolve executive ID once for the entire batch (case-insensitive + fallback)
    let execId: string | null = null;
    const cleanExec = executiveName?.trim();
    if (cleanExec && cleanExec !== "-- Unassigned --") {
      let { data: execData } = await supabase
        .from("executives")
        .select("id, name")
        .ilike("name", cleanExec)
        .maybeSingle();

      if (!execData) {
        const { data: allExecs } = await supabase.from("executives").select("id, name");
        if (allExecs) {
          const found = allExecs.find(
            (e) => e.name.trim().toLowerCase() === cleanExec.toLowerCase()
          );
          if (found) execData = found;
        }
      }

      if (execData) {
        execId = execData.id;
      }
    }

    // 2. Fetch existing shops in a single query to eliminate 60+ individual queries
    const { data: existingShopsRaw } = await supabase
      .from("shops")
      .select("id, name, company_id, company_name, brand_id, brand_name");

    const existingMap = new Map<string, any>();
    if (existingShopsRaw) {
      for (const s of existingShopsRaw) {
        const k = s.name.trim().toLowerCase();
        const isTargetMatch =
          companyId && (s.company_id === companyId || s.brand_id === companyId);
        if (!existingMap.has(k) || isTargetMatch) {
          existingMap.set(k, s);
        }
      }
    }

    // 3. Separate new shops to insert from existing shops
    const resolvedShops: { id: string; name: string }[] = [];
    const newShopsToInsert: any[] = [];

    for (const name of cleanNames) {
      const existing = existingMap.get(name.toLowerCase());
      if (existing) {
        resolvedShops.push({ id: existing.id, name: existing.name });
      } else {
        newShopsToInsert.push({
          name,
          company_id: companyId || null,
          company_name: companyName || null,
          brand_id: companyId || null,
          brand_name: companyName || null,
        });
      }
    }

    // 4. Bulk insert newly registered shops in fast chunks (e.g. 50 at a time)
    if (newShopsToInsert.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < newShopsToInsert.length; i += chunkSize) {
        const chunk = newShopsToInsert.slice(i, i + chunkSize);
        const { data: inserted, error: insErr } = await supabase
          .from("shops")
          .insert(chunk)
          .select("id, name");

        if (inserted) {
          for (const ins of inserted) {
            resolvedShops.push({ id: ins.id, name: ins.name });
          }
        } else if (insErr) {
          // Fallback if legacy unique name constraint is active on shops table
          const { data: fallbackShops } = await supabase
            .from("shops")
            .upsert(chunk, { onConflict: "name" })
            .select("id, name");

          if (fallbackShops) {
            for (const fb of fallbackShops) {
              resolvedShops.push({ id: fb.id, name: fb.name });
            }
          }
        }
      }
    }

    // 5. Bulk assign shop mappings safely without relying on a unique constraint on shop_id
    if (resolvedShops.length > 0) {
      const shopIds = resolvedShops.map((s) => s.id);

      // Check existing mapping records for these shops
      const { data: existingMappings } = await supabase
        .from("shop_mappings")
        .select("id, shop_id, company_id, brand_id")
        .in("shop_id", shopIds);

      const existingMapByShopAndCompany = new Map<string, string>();
      const existingMapByShopOnly = new Map<string, string>();

      if (existingMappings) {
        for (const em of existingMappings) {
          existingMapByShopOnly.set(em.shop_id, em.id);
          const cKey = em.company_id || em.brand_id || "general";
          existingMapByShopAndCompany.set(`${em.shop_id}_${cKey}`, em.id);
        }
      }

      const updates: any[] = [];
      const inserts: any[] = [];

      for (const s of resolvedShops) {
        const cKey = companyId || "general";
        const matchedExistingId =
          existingMapByShopAndCompany.get(`${s.id}_${cKey}`) ||
          (!companyId ? existingMapByShopOnly.get(s.id) : undefined);

        const payload: any = {
          shop_id: s.id,
          executive_id: execId,
          company_id: companyId || null,
          company_name: companyName || null,
          brand_id: companyId || null,
          brand_name: companyName || null,
        };

        if (matchedExistingId) {
          updates.push({ id: matchedExistingId, ...payload });
        } else {
          inserts.push(payload);
        }
      }

      // Update existing mapping records by primary key `id`
      if (updates.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize);
          const { error: updErr } = await supabase
            .from("shop_mappings")
            .upsert(chunk, { onConflict: "id" });
          if (updErr) {
            console.error("Bulk update shop_mappings error:", updErr);
          }
        }
      }

      // Insert brand new mappings
      if (inserts.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < inserts.length; i += chunkSize) {
          const chunk = inserts.slice(i, i + chunkSize);
          const { error: insErr } = await supabase
            .from("shop_mappings")
            .insert(chunk);
          if (insErr) {
            console.error("Bulk insert shop_mappings error:", insErr);
          }
        }
      }
    }

    // 6. Bulk route any existing collections for these shops to the executive
    if (cleanExec && execId) {
      let colQuery = supabase
        .from("shop_collections")
        .update({ executive_name: cleanExec })
        .in("shop_name", cleanNames);

      if (companyId) {
        colQuery = colQuery.or(`company_id.eq.${companyId},brand_id.eq.${companyId}`);
      }
      await colQuery;
    }

    return { success: true, count: cleanNames.length };
  } catch (err: any) {
    console.error("Bulk add shops error:", err);
    return { success: false, count: 0, error: err.message || "Failed to bulk import shops" };
  }
}

/**
 * Update executive assignment for an existing shop and route its collections
 */
export async function updateShopExecutive(
  shopId: string,
  shopName: string,
  executiveName: string,
  companyId?: string,
  companyName?: string,
  mappingId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = createClient();
  if (!supabase) return false;

  const cleanExec = executiveName.trim();
  const cleanShopName = shopName.trim();

  // 1. Locate specific mapping target
  let targetMapping: any = null;

  if (mappingId) {
    const { data: mapById } = await supabase
      .from("shop_mappings")
      .select("id, shop_id, executive_id, company_id, company_name, brand_id, brand_name")
      .eq("id", mappingId)
      .maybeSingle();
    if (mapById) {
      targetMapping = mapById;
    }
  }

  // If not matched by mappingId, search all mappings for this shop
  if (!targetMapping) {
    const { data: existingMaps } = await supabase
      .from("shop_mappings")
      .select("id, shop_id, executive_id, company_id, company_name, brand_id, brand_name")
      .eq("shop_id", shopId);

    if (existingMaps && existingMaps.length > 0) {
      if (companyId) {
        targetMapping = existingMaps.find(
          (m) => m.company_id === companyId || m.brand_id === companyId
        );
      }
      if (!targetMapping && companyName) {
        targetMapping = existingMaps.find(
          (m) =>
            m.company_name?.trim().toLowerCase() === companyName.trim().toLowerCase() ||
            m.brand_name?.trim().toLowerCase() === companyName.trim().toLowerCase()
        );
      }
      // If still not matched, and exactly one mapping exists for this shop, use it
      if (!targetMapping && existingMaps.length === 1) {
        targetMapping = existingMaps[0];
      }
    }
  }

  // 2. Resolve effective company and brand information to PREVENT wiping or altering brand
  let finalCompanyId =
    companyId ||
    targetMapping?.company_id ||
    targetMapping?.brand_id ||
    null;

  let finalCompanyName =
    companyName ||
    targetMapping?.company_name ||
    targetMapping?.brand_name ||
    null;

  // Fallback to physical shop record if brand is still missing
  if (!finalCompanyId && !finalCompanyName) {
    const { data: sRecord } = await supabase
      .from("shops")
      .select("company_id, company_name, brand_id, brand_name")
      .eq("id", shopId)
      .maybeSingle();

    if (sRecord) {
      finalCompanyId = sRecord.company_id || sRecord.brand_id || null;
      finalCompanyName = sRecord.company_name || sRecord.brand_name || null;
    }
  }

  // Fallback to collections table if brand is still missing (healing previously wiped records)
  if (!finalCompanyId && !finalCompanyName) {
    const { data: colRec } = await supabase
      .from("shop_collections")
      .select("company_id, company_name, brand_id, brand_name")
      .ilike("shop_name", cleanShopName)
      .not("company_name", "is", null)
      .limit(1)
      .maybeSingle();

    if (colRec) {
      finalCompanyId = colRec.company_id || colRec.brand_id || null;
      finalCompanyName = colRec.company_name || colRec.brand_name || null;
    }
  }

  // 3. Handle unassignment
  if (!cleanExec || cleanExec === "-- Unassigned --") {
    if (targetMapping?.id) {
      await supabase
        .from("shop_mappings")
        .update({
          executive_id: null,
          company_id: finalCompanyId,
          company_name: finalCompanyName,
          brand_id: finalCompanyId,
          brand_name: finalCompanyName,
        })
        .eq("id", targetMapping.id);
    } else {
      await supabase.from("shop_mappings").insert({
        shop_id: shopId,
        executive_id: null,
        company_id: finalCompanyId,
        company_name: finalCompanyName,
        brand_id: finalCompanyId,
        brand_name: finalCompanyName,
      });
    }

    // Unassign collections ONLY for this shop and brand!
    let unColQuery = supabase
      .from("shop_collections")
      .update({ executive_name: null })
      .ilike("shop_name", cleanShopName);

    if (finalCompanyId) {
      unColQuery = unColQuery.or(`company_id.eq.${finalCompanyId},brand_id.eq.${finalCompanyId}`);
    } else if (finalCompanyName) {
      unColQuery = unColQuery.or(`company_name.ilike.${finalCompanyName},brand_name.ilike.${finalCompanyName}`);
    }
    await unColQuery;

    return true;
  }

  // 4. Resolve executive (case-insensitive + fallback)
  let { data: execData } = await supabase
    .from("executives")
    .select("id, name")
    .ilike("name", cleanExec)
    .maybeSingle();

  if (!execData) {
    const { data: allExecs } = await supabase.from("executives").select("id, name");
    if (allExecs) {
      const found = allExecs.find(
        (e) => e.name.trim().toLowerCase() === cleanExec.toLowerCase()
      );
      if (found) execData = found;
    }
  }

  if (!execData) return false;

  // 5. Update or insert mapping record preserving brand
  const mapPayload: any = {
    shop_id: shopId,
    executive_id: execData.id,
    company_id: finalCompanyId,
    company_name: finalCompanyName,
    brand_id: finalCompanyId,
    brand_name: finalCompanyName,
  };

  if (targetMapping?.id) {
    await supabase.from("shop_mappings").update(mapPayload).eq("id", targetMapping.id);
  } else {
    const { error: insErr } = await supabase.from("shop_mappings").insert(mapPayload);
    if (insErr) {
      await supabase.from("shop_mappings").upsert(mapPayload, { onConflict: "shop_id" });
    }
  }

  // 6. Only set company on physical shop if it was previously unset (never overwrite existing)
  if (finalCompanyName || finalCompanyId) {
    try {
      const { data: sRecord } = await supabase
        .from("shops")
        .select("company_name, brand_name")
        .eq("id", shopId)
        .maybeSingle();

      if (sRecord && !sRecord.company_name && !sRecord.brand_name) {
        await supabase
          .from("shops")
          .update({
            company_id: finalCompanyId,
            company_name: finalCompanyName,
            brand_id: finalCompanyId,
            brand_name: finalCompanyName,
          })
          .eq("id", shopId);
      }
    } catch {
      // Ignore if columns don't exist yet on remote table
    }
  }

  // 7. Route collections for this shop and brand specifically to this executive!
  let colRouteQuery = supabase
    .from("shop_collections")
    .update({ executive_name: cleanExec })
    .ilike("shop_name", cleanShopName);

  if (finalCompanyId) {
    colRouteQuery = colRouteQuery.or(`company_id.eq.${finalCompanyId},brand_id.eq.${finalCompanyId}`);
  } else if (finalCompanyName) {
    colRouteQuery = colRouteQuery.or(`company_name.ilike.${finalCompanyName},brand_name.ilike.${finalCompanyName}`);
  }
  await colRouteQuery;

  return true;
}

/**
 * Add a new executive member with username & password
 */
export async function addExecutive(
  name: string,
  username?: string,
  password?: string,
  companies?: string[]
): Promise<Executive | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;

  let execRecord: Executive = { id: `exec-${Date.now()}`, name: cleanName, companies: companies || [] };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error: execError } = await supabase
        .from("executives")
        .upsert({ name: cleanName }, { onConflict: "name" })
        .select("id, name")
        .maybeSingle();

      if (execError) {
        throw new Error(execError.message || "Failed to save executive to database.");
      }

      if (data) {
        execRecord = { ...data, companies: companies || [] };
      }

      // Safely attempt to persist companies on executives record if column exists
      if (companies && companies.length > 0 && data?.id) {
        try {
          await supabase.from("executives").update({ companies }).eq("id", data.id);
        } catch {
          // Ignore if column doesn't exist on remote table
        }
      }
    }
  }

  const cleanUser =
    username?.trim() ||
    cleanName
      .toLowerCase()
      .split(/\s+/)[0]
      .replace(/[^a-z0-9]/g, "") ||
    `exec_${Date.now().toString().slice(-4)}`;

  const cleanPass = password?.trim() || "password123";

  // Register in Supabase Auth with companies metadata
  const authRes = await signUpExecutiveWithSupabase(cleanName, cleanUser, cleanPass, undefined, companies);
  if (!authRes.success) {
    throw new Error(authRes.error || "Failed to register executive in Supabase Auth.");
  }

  // Save directly assigned companies locally
  if (companies) {
    saveExecutiveCompanies(cleanName, companies);
  }

  return {
    ...execRecord,
    username: cleanUser,
    password: cleanPass,
    companies: companies || [],
  };
}

/**
 * Update username, password, and assigned companies for an executive
 */
export async function updateExecutiveCredentials(
  name: string,
  username: string,
  password: string,
  oldPassword?: string,
  companies?: string[]
): Promise<boolean> {
  const authRes = await signUpExecutiveWithSupabase(name, username.trim(), password.trim(), oldPassword, companies);
  if (!authRes.success) {
    throw new Error(authRes.error || "Failed to update credentials in Supabase Auth.");
  }
  if (companies) {
    saveExecutiveCompanies(name, companies);
  }
  return true;
}

/**
 * Delete an executive member, unassign their shops and collections
 */
export async function deleteExecutive(id: string, name: string): Promise<boolean> {
  const cleanName = name.trim();

  // Clean up cached credentials and assigned companies
  removeExecutiveCredential(cleanName);
  removeStoredExecutiveCompanies(cleanName);

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      // 1. Unassign shops mapped to this executive
      await supabase
        .from("shop_mappings")
        .update({ executive_id: null })
        .eq("executive_id", id);

      // 2. Unassign collections tagged with this executive's name
      if (cleanName) {
        await supabase
          .from("shop_collections")
          .update({ executive_name: null })
          .ilike("executive_name", cleanName);
      }

      // 3. Delete from executives table
      const { error } = await supabase
        .from("executives")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message || "Failed to delete executive from database.");
      }
    }
  }

  return true;
}

/**
 * Fetch all upload history batches from Supabase
 */
export async function getUploadBatches(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("upload_batches")
    .select("id, file_name, company_id, company_name, total_shops, total_items, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (error || !data) return [];
  return data.map((b: any) => ({
    id: b.id,
    fileName: b.file_name,
    companyId: b.company_id || b.brand_id,
    companyName: b.company_name || b.brand_name,
    brandId: b.brand_id || b.company_id,
    brandName: b.brand_name || b.company_name,
    totalRows: b.total_items || b.total_shops || 0,
    uploadedAt: new Date(b.uploaded_at).toLocaleString(),
    status: "completed",
  }));
}

/**
 * Delete an upload batch and its associated shop collections & items
 */
export async function deleteUploadBatch(
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  try {
    // 1. Find all collection IDs belonging to this upload batch
    const { data: cols } = await supabase
      .from("shop_collections")
      .select("id")
      .eq("upload_batch_id", batchId);

    if (cols && cols.length > 0) {
      const colIds = cols.map((c: any) => c.id);

      // Explicitly delete all child collection items first to prevent foreign key errors
      const { error: itemsErr } = await supabase
        .from("collection_items")
        .delete()
        .in("shop_collection_id", colIds);

      if (itemsErr) {
        console.warn("Warning deleting collection items for batch:", itemsErr);
      }
    }

    // 2. Delete associated shop collections
    const { error: colErr } = await supabase
      .from("shop_collections")
      .delete()
      .eq("upload_batch_id", batchId);

    if (colErr) {
      console.error("Error deleting shop collections for batch:", colErr);
      return { success: false, error: colErr.message };
    }

    // 3. Delete the upload batch record itself
    const { error: batchErr } = await supabase
      .from("upload_batches")
      .delete()
      .eq("id", batchId);

    if (batchErr) {
      console.error("Error deleting upload batch:", batchErr);
      return { success: false, error: batchErr.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Delete batch exception:", err);
    return { success: false, error: err.message || "Failed to delete batch" };
  }
}

/**
 * Delete a retail shop or a specific brand mapping for that shop.
 * If the shop has other brand mappings, only the specified brand mapping is removed
 * without deleting the physical shop or its other brands!
 */
export async function deleteShop(
  shopId: string,
  companyName?: string,
  mappingId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  try {
    const { data: shopRecord } = await supabase
      .from("shops")
      .select("id, name, company_name, brand_name")
      .eq("id", shopId)
      .maybeSingle();

    const shopName = shopRecord?.name;

    // Fetch all current mappings for this shop
    const { data: currentMappings } = await supabase
      .from("shop_mappings")
      .select("id, company_name, brand_name, executive_id")
      .eq("shop_id", shopId);

    const mappings = currentMappings || [];

    // Find the specific mapping to remove
    let targetMapping = mappingId ? mappings.find((m) => m.id === mappingId) : undefined;
    if (!targetMapping && companyName) {
      targetMapping = mappings.find(
        (m) =>
          m.company_name?.trim().toLowerCase() === companyName.trim().toLowerCase() ||
          m.brand_name?.trim().toLowerCase() === companyName.trim().toLowerCase()
      );
    }

    const otherMappings = mappings.filter((m) =>
      targetMapping ? m.id !== targetMapping.id : false
    );

    // If other brand mappings exist for this shop: ONLY delete this brand mapping!
    if (targetMapping && otherMappings.length > 0) {
      // 1. Delete this specific mapping
      await supabase.from("shop_mappings").delete().eq("id", targetMapping.id);

      // 2. Unassign collections only for this brand
      const brandToDelete = targetMapping.company_name || targetMapping.brand_name || companyName;
      if (shopName && brandToDelete) {
        await supabase
          .from("shop_collections")
          .update({ executive_name: null })
          .eq("shop_name", shopName)
          .or(`company_name.ilike.${brandToDelete},brand_name.ilike.${brandToDelete}`);
      }

      // 3. If the shop record directly pointed to this deleted company, update it to another remaining brand
      if (
        shopRecord?.company_name &&
        brandToDelete &&
        shopRecord.company_name.toLowerCase() === brandToDelete.toLowerCase()
      ) {
        const survivingBrand =
          otherMappings[0]?.company_name || otherMappings[0]?.brand_name || null;
        await supabase
          .from("shops")
          .update({ company_name: survivingBrand, brand_name: survivingBrand })
          .eq("id", shopId);
      }

      return { success: true };
    }

    // Otherwise, this shop has NO other brands remaining: delete the shop entirely!
    // 1. Unassign all collections for this shop
    if (shopName) {
      await supabase.from("shop_collections").update({ executive_name: null }).eq("shop_name", shopName);
    }

    // 2. Delete all mappings for this shop
    await supabase.from("shop_mappings").delete().eq("shop_id", shopId);

    // 3. Delete the shop record
    const { error } = await supabase.from("shops").delete().eq("id", shopId);
    if (error) {
      console.error("Error deleting shop:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Delete shop exception:", err);
    return { success: false, error: err.message || "Failed to delete shop" };
  }
}

/**
 * Delete all retail shops and their executive mappings
 */
export async function deleteAllShops(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  try {
    // 1. Delete all shop mappings
    await supabase.from("shop_mappings").delete().not("id", "is", null);

    // 2. Unassign collections
    await supabase.from("shop_collections").update({ executive_name: null }).not("id", "is", null);

    // 3. Delete all shops
    const { error } = await supabase.from("shops").delete().not("id", "is", null);
    if (error) {
      console.error("Error deleting all shops:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Delete all shops exception:", err);
    return { success: false, error: err.message || "Failed to delete all shops" };
  }
}

/**
 * Delete a specific list of retail shops or their brand mappings.
 * Brand-Safe: If a shop is registered under multiple brands and only one brand is deleted,
 * only that brand mapping is removed while keeping the shop and its other brands intact!
 */
export async function deleteShopsBulk(
  shopsToDelete: Array<{
    id: string;
    name: string;
    companyName?: string;
    brandName?: string;
    mappingId?: string;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, count: 0, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, count: 0, error: "Supabase client unavailable" };

  if (!shopsToDelete || shopsToDelete.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const CHUNK_SIZE = 100;

    // 1. Group items to delete by shop_id
    const deleteByShopId = new Map<string, Array<{ mappingId?: string; companyName?: string }>>();
    const shopNamesMap = new Map<string, string>();

    for (const item of shopsToDelete) {
      if (!deleteByShopId.has(item.id)) {
        deleteByShopId.set(item.id, []);
      }
      deleteByShopId.get(item.id)!.push({
        mappingId: item.mappingId,
        companyName: item.companyName || item.brandName,
      });
      shopNamesMap.set(item.id, item.name);
    }

    const allShopIds = Array.from(deleteByShopId.keys());

    // 2. Fetch all current mappings for all these shops to identify which shops have surviving brands
    const existingMappingsByShop = new Map<
      string,
      Array<{ id: string; company_name?: string; brand_name?: string }>
    >();

    for (let i = 0; i < allShopIds.length; i += CHUNK_SIZE) {
      const chunk = allShopIds.slice(i, i + CHUNK_SIZE);
      const { data: mappingsData } = await supabase
        .from("shop_mappings")
        .select("id, shop_id, company_name, brand_name")
        .in("shop_id", chunk);

      for (const m of mappingsData || []) {
        if (!existingMappingsByShop.has(m.shop_id)) {
          existingMappingsByShop.set(m.shop_id, []);
        }
        existingMappingsByShop.get(m.shop_id)!.push(m);
      }
    }

    const mappingIdsToDelete: string[] = [];
    const shopIdsToDeleteCompletely: string[] = [];
    const brandsToUnassignByShopName = new Map<string, Set<string>>();
    const shopsToUnassignCompletely: string[] = [];

    for (const [shopId, itemsToDelete] of deleteByShopId.entries()) {
      const shopName = shopNamesMap.get(shopId) || "";
      const currentMappings = existingMappingsByShop.get(shopId) || [];

      // Determine target mapping IDs and target brands for this shop
      const targetMappingIds = new Set<string>();
      const targetBrands = new Set<string>();

      for (const it of itemsToDelete) {
        if (it.mappingId) {
          targetMappingIds.add(it.mappingId);
        }
        if (it.companyName) {
          targetBrands.add(it.companyName.trim().toLowerCase());
        }
      }

      // If mappingId wasn't provided, match mappings by company name
      for (const m of currentMappings) {
        const cName = (m.company_name || m.brand_name || "").trim().toLowerCase();
        if (cName && targetBrands.has(cName)) {
          targetMappingIds.add(m.id);
        }
      }

      // Check which mappings survive for this shop
      const survivingMappings = currentMappings.filter((m) => !targetMappingIds.has(m.id));

      for (const mId of targetMappingIds) {
        mappingIdsToDelete.push(mId);
      }

      if (survivingMappings.length > 0) {
        // This shop HAS OTHER BRANDS!
        // DO NOT delete the shop from the shops table!
        if (!brandsToUnassignByShopName.has(shopName)) {
          brandsToUnassignByShopName.set(shopName, new Set());
        }
        for (const b of targetBrands) {
          brandsToUnassignByShopName.get(shopName)!.add(b);
        }
      } else {
        // No other brands survive for this shop -> safe to delete completely from shops table
        shopIdsToDeleteCompletely.push(shopId);
        if (shopName) shopsToUnassignCompletely.push(shopName);
      }
    }

    // 3. Delete the target mappings
    for (let i = 0; i < mappingIdsToDelete.length; i += CHUNK_SIZE) {
      const chunk = mappingIdsToDelete.slice(i, i + CHUNK_SIZE);
      await supabase.from("shop_mappings").delete().in("id", chunk);
    }

    // 4. Unassign collections for surviving shops (only for the deleted brands)
    for (const [shopName, brands] of brandsToUnassignByShopName.entries()) {
      for (const b of brands) {
        await supabase
          .from("shop_collections")
          .update({ executive_name: null })
          .eq("shop_name", shopName)
          .or(`company_name.ilike.${b},brand_name.ilike.${b}`);
      }
    }

    // 5. Unassign collections for shops that are being deleted completely
    for (let i = 0; i < shopsToUnassignCompletely.length; i += CHUNK_SIZE) {
      const chunk = shopsToUnassignCompletely.slice(i, i + CHUNK_SIZE);
      await supabase.from("shop_collections").update({ executive_name: null }).in("shop_name", chunk);
    }

    // 6. Delete shops from shops table that have no other brands
    for (let i = 0; i < shopIdsToDeleteCompletely.length; i += CHUNK_SIZE) {
      const chunk = shopIdsToDeleteCompletely.slice(i, i + CHUNK_SIZE);
      await supabase.from("shop_mappings").delete().in("shop_id", chunk);
      await supabase.from("shops").delete().in("id", chunk);
    }

    return { success: true, count: shopsToDelete.length };
  } catch (err: any) {
    console.error("Delete shops bulk exception:", err);
    return { success: false, count: 0, error: err.message || "Failed to delete shops" };
  }
}

/**
 * Delete a specific list of retail shops and their executive mappings by IDs or Shop items
 */
export async function deleteShopsByIds(
  shopIdsOrItems:
    | string[]
    | Array<{ id: string; name: string; companyName?: string; brandName?: string; mappingId?: string }>,
  shopNames?: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (
    Array.isArray(shopIdsOrItems) &&
    shopIdsOrItems.length > 0 &&
    typeof shopIdsOrItems[0] !== "string"
  ) {
    return deleteShopsBulk(shopIdsOrItems as any);
  }

  const stringIds = (shopIdsOrItems as string[]) || [];
  const items = stringIds.map((id, idx) => ({
    id,
    name: shopNames?.[idx] || "",
  }));
  return deleteShopsBulk(items);
}

/**
 * Update the file name of an uploaded batch
 */
export async function updateUploadBatchFileName(
  batchId: string,
  newFileName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  const clean = newFileName.trim();
  if (!clean) return { success: false, error: "File name cannot be empty" };

  try {
    const { error } = await supabase
      .from("upload_batches")
      .update({ file_name: clean })
      .eq("id", batchId);

    if (error) {
      console.error("Error updating batch file name:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Update batch file name exception:", err);
    return { success: false, error: err.message || "Failed to update file name" };
  }
}

/**
 * Fetch all companies / brands from Supabase
 */
export async function getCompanies(): Promise<Company[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, code, created_at")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error fetching companies:", error);
    return [];
  }

  return data;
}

/**
 * Add a new company / brand
 */
export async function addCompany(
  name: string,
  code?: string
): Promise<{ success: boolean; data?: Company; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  const cleanName = name.trim();
  if (!cleanName) return { success: false, error: "Company name is required" };

  try {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: cleanName,
        code: code?.trim() || cleanName.toUpperCase().slice(0, 10),
      })
      .select("id, name, code, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Company "${cleanName}" already exists.` };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add company" };
  }
}

/**
 * Delete a company
 */
export async function deleteCompany(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  try {
    // 1. Fetch company record first to obtain its exact name (for backwards matching)
    const { data: comp } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    const compName = comp?.name;

    // 2. Find all shop collections associated with this company
    let colQuery = supabase.from("shop_collections").select("id");
    if (compName) {
      colQuery = colQuery.or(`company_id.eq.${id},brand_id.eq.${id},company_name.eq.${compName},brand_name.eq.${compName}`);
    } else {
      colQuery = colQuery.or(`company_id.eq.${id},brand_id.eq.${id}`);
    }
    const { data: cols } = await colQuery;

    if (cols && cols.length > 0) {
      const colIds = cols.map((c: any) => c.id);

      // Delete all child collection items for these collections
      const { error: itemErr } = await supabase
        .from("collection_items")
        .delete()
        .in("shop_collection_id", colIds);

      if (itemErr) {
        console.warn("Warning deleting collection items for company:", itemErr);
      }

      // Delete the shop collections themselves
      const { error: colErr } = await supabase
        .from("shop_collections")
        .delete()
        .in("id", colIds);

      if (colErr) {
        console.error("Error deleting shop collections for company:", colErr);
        return { success: false, error: colErr.message };
      }
    }

    // 3. Delete all upload batches uploaded for this company
    let batchQuery = supabase.from("upload_batches").delete();
    if (compName) {
      batchQuery = batchQuery.or(`company_id.eq.${id},brand_id.eq.${id},company_name.eq.${compName},brand_name.eq.${compName}`);
    } else {
      batchQuery = batchQuery.or(`company_id.eq.${id},brand_id.eq.${id}`);
    }
    const { error: batchErr } = await batchQuery;
    if (batchErr) {
      console.warn("Warning deleting upload batches for company:", batchErr);
    }

    // 4. Finally delete the company row from companies master
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err: any) {
    console.error("Delete company exception:", err);
    return { success: false, error: err.message || "Failed to delete company and associated data" };
  }
}


