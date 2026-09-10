
import { createClient, isSupabaseConfigured } from "./client";
import { ShopCollection, Executive, Shop, ShopMapping } from "@/types";
import { signUpExecutiveWithSupabase, getStoredExecutiveCredentials, removeExecutiveCredential } from "@/lib/auth-service";

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
  collections: ShopCollection[]
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured. Please check your Supabase credentials in .env.local" };
  }

  const supabase = createClient();
  if (!supabase) return { success: false, error: "Failed to initialize Supabase client" };

  try {
    const validCollections = collections.filter(
      (c) => !isCancelledOrInvalidShop(c.shopName)
    );
    const totalItems = validCollections.reduce((acc, c) => acc + c.items.length, 0);

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

    // 1. Create Upload Batch Record
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        file_name: fileName,
        total_shops: validCollections.length,
        total_items: totalItems,
      })
      .select("id")
      .single();

    if (batchError) {
      console.error("Error creating upload batch:", batchError);
      return { success: false, error: batchError.message };
    }

    const batchId = batch.id;

    // 2. Process each parent shop collection:
    // Ensure all shops exist in `shops` table and `shop_mappings`
    for (const shop of validCollections) {
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

      if (!existingShop) {
        // A. NEW SHOP: Insert into `shops` table
        const { data: newShop, error: newShopErr } = await supabase
          .from("shops")
          .insert({ name: cleanShopName })
          .select("id, name")
          .single();

        if (newShopErr || !newShop) {
          console.error("Error creating new shop from Excel:", newShopErr);
          // Fallback fetch in case of concurrent insert
          const { data: fallbackShop } = await supabase
            .from("shops")
            .select("id, name")
            .ilike("name", cleanShopName)
            .maybeSingle();
          shopId = fallbackShop?.id || "";
        } else {
          shopId = newShop.id;
        }

        // B. Add new shop into `shop_mappings` as unmapped (executive_id = null)
        // so admin can specify/assign mapping in Shop Mappings
        if (shopId) {
          await supabase
            .from("shop_mappings")
            .upsert(
              { shop_id: shopId, executive_id: null },
              { onConflict: "shop_id" }
            );
        }
      } else {
        shopId = existingShop.id;

        // C. ALREADY REGISTERED SHOP:
        // Check if this shop already has an executive mapping in `shop_mappings`
        const { data: mappingData } = await supabase
          .from("shop_mappings")
          .select("executive_id, executives:executive_id (name)")
          .eq("shop_id", shopId)
          .maybeSingle();

        const mappedExec = (mappingData?.executives as any)?.name;
        if (mappedExec) {
          // If already mapped shop, route collection directly to that executive
          assignedExecName = mappedExec;
        } else if (!mappingData) {
          // Ensure mapping record exists as unmapped
          await supabase
            .from("shop_mappings")
            .upsert(
              { shop_id: shopId, executive_id: null },
              { onConflict: "shop_id" }
            );
        }
      }

      // D. Insert into `shop_collections`
      const { data: parentShop, error: shopError } = await supabase
        .from("shop_collections")
        .insert({
          shop_name: cleanShopName,
          invoice_no: shop.invoiceNo,
          invoice_date: shop.invoiceDate,
          gstin_uin: shop.gstinUin,
          total_amount: shop.totalAmount,
          total_quantity: shop.totalQuantity ? String(shop.totalQuantity) : null,
          executive_name: assignedExecName || null,
          upload_batch_id: batchId,
        })
        .select("id")
        .single();

      if (shopError) {
        console.error(`Error saving shop ${cleanShopName}:`, shopError);
        continue;
      }

      // E. Insert child items for this parent shop
      if (shop.items && shop.items.length > 0) {
        const itemRows = shop.items.map((item) => ({
          shop_collection_id: parentShop.id,
          product_name: item.productName,
          quantity: String(item.quantity || "1 Nos"),
          amount: Number(item.amount) || 0,
        }));

        const { error: itemsError } = await supabase
          .from("collection_items")
          .insert(itemRows);

        if (itemsError) {
          console.error(`Error saving items for ${cleanShopName}:`, itemsError);
        }
      }
    }

    return { success: true, batchId };
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
    .map((row: any) => ({
      id: row.id,
      shopName: row.shop_name,
      invoiceNo: row.invoice_no,
      invoiceDate: row.invoice_date || "",
      gstinUin: row.gstin_uin || "",
      totalAmount: Number(row.total_amount) || 0,
      totalQuantity: row.total_quantity,
      executiveName: row.executive_name,
      status: row.executive_name ? "mapped" : "unmapped",
      isPaid: typeof paidMap[row.id] === "boolean" ? paidMap[row.id] : Boolean(row.is_paid),
      items: (row.collection_items || []).map((item: any) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        amount: Number(item.amount) || 0,
      })),
    }));
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
        await supabase
          .from("shop_collections")
          .update({ is_paid: isPaid } as any)
          .eq("id", invoiceId);
      }
    } catch {
      // Ignored if is_paid column does not exist yet in remote schema
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
      shop_mappings (
        executive_id,
        executives:executive_id (name)
      )
    `)
    .order("name");

  if (error || !data) {
    console.error("Error fetching shops:", error);
    return [];
  }

  return data
    .filter((s: any) => !isCancelledOrInvalidShop(s.name))
    .map((s: any) => {
      const mapping = Array.isArray(s.shop_mappings) ? s.shop_mappings[0] : s.shop_mappings;
      const execName = mapping?.executives?.name;
      return {
        id: s.id,
        name: s.name,
        assignedExecutiveName: execName || undefined,
      };
    });
}

/**
 * Fetch shop to executive mappings (all registered shops left-joined with mappings)
 */
export async function getShopMappings(): Promise<ShopMapping[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shops")
    .select(`
      id,
      name,
      shop_mappings (
        id,
        executive_id,
        executives:executive_id (name)
      )
    `)
    .order("name");

  if (error || !data) return [];

  return data
    .filter((shop: any) => !isCancelledOrInvalidShop(shop.name))
    .map((shop: any) => {
      const mapping = Array.isArray(shop.shop_mappings)
        ? shop.shop_mappings[0]
        : shop.shop_mappings;
      const execName = mapping?.executives?.name;

      return {
        id: mapping?.id || `map-${shop.id}`,
        shopId: shop.id,
        shopName: shop.name,
        executiveId: mapping?.executive_id || undefined,
        executiveName: execName || undefined,
        status: execName ? ("mapped" as const) : ("unmapped" as const),
      };
    });
}

/**
 * Add a single shop and optionally map to an executive
 */
export async function addShopWithExecutive(
  shopName: string,
  executiveName?: string
): Promise<{ success: boolean; shop?: Shop; error?: string }> {
  const cleanName = shopName.trim();
  if (!cleanName) return { success: false, error: "Shop name cannot be empty" };

  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured" };
  }

  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client not initialized" };

  // 1. Insert or get shop
  const { data: shopData, error: shopError } = await supabase
    .from("shops")
    .upsert({ name: cleanName }, { onConflict: "name" })
    .select("id, name")
    .single();

  if (shopError || !shopData) {
    return { success: false, error: shopError?.message || "Failed to create shop" };
  }

  // 2. Insert or update mapping
  let execId: string | null = null;
  const cleanExec = executiveName?.trim();
  if (cleanExec && cleanExec !== "-- Unassigned --") {
    const { data: execData } = await supabase
      .from("executives")
      .select("id")
      .eq("name", cleanExec)
      .maybeSingle();

    if (execData) {
      execId = execData.id;
    }
  }

  await supabase
    .from("shop_mappings")
    .upsert(
      { shop_id: shopData.id, executive_id: execId },
      { onConflict: "shop_id" }
    );

  // 3. If executive was assigned, also cascade update to any existing collections
  if (cleanExec && execId) {
    await supabase
      .from("shop_collections")
      .update({ executive_name: cleanExec })
      .ilike("shop_name", cleanName);
  }

  return {
    success: true,
    shop: {
      id: shopData.id,
      name: shopData.name,
      assignedExecutiveName: execId ? cleanExec : undefined,
    },
  };
}

/**
 * Bulk add multiple shops at once with optional executive assignment
 */
export async function bulkAddShopsWithExecutive(
  shopNames: string[],
  executiveName?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const cleanNames = Array.from(
    new Set(shopNames.map((n) => n.trim()).filter((n) => n.length > 0))
  );
  if (cleanNames.length === 0) return { success: false, count: 0, error: "No valid shop names provided" };

  for (const name of cleanNames) {
    await addShopWithExecutive(name, executiveName);
  }

  return { success: true, count: cleanNames.length };
}

/**
 * Update executive assignment for an existing shop and route all its collections
 */
export async function updateShopExecutive(
  shopId: string,
  shopName: string,
  executiveName: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = createClient();
  if (!supabase) return false;

  const cleanExec = executiveName.trim();
  const cleanShopName = shopName.trim();

  // If unassigned
  if (!cleanExec || cleanExec === "-- Unassigned --") {
    await supabase
      .from("shop_mappings")
      .upsert(
        { shop_id: shopId, executive_id: null },
        { onConflict: "shop_id" }
      );

    // Unassign collections for this shop
    await supabase
      .from("shop_collections")
      .update({ executive_name: null })
      .ilike("shop_name", cleanShopName);

    return true;
  }

  const { data: execData } = await supabase
    .from("executives")
    .select("id")
    .eq("name", cleanExec)
    .maybeSingle();

  if (!execData) return false;

  const { error } = await supabase
    .from("shop_mappings")
    .upsert(
      { shop_id: shopId, executive_id: execData.id },
      { onConflict: "shop_id" }
    );

  if (!error) {
    // Automatically route all existing collections for this shop to this executive!
    await supabase
      .from("shop_collections")
      .update({ executive_name: cleanExec })
      .ilike("shop_name", cleanShopName);
  }

  return !error;
}

/**
 * Add a new executive member with username & password
 */
export async function addExecutive(
  name: string,
  username?: string,
  password?: string
): Promise<Executive | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;

  let execRecord: Executive = { id: `exec-${Date.now()}`, name: cleanName };

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
        execRecord = data;
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

  // Register in Supabase Auth
  const authRes = await signUpExecutiveWithSupabase(cleanName, cleanUser, cleanPass);
  if (!authRes.success) {
    throw new Error(authRes.error || "Failed to register executive in Supabase Auth.");
  }

  return {
    ...execRecord,
    username: cleanUser,
    password: cleanPass,
  };
}

/**
 * Update username and password for an executive
 */
export async function updateExecutiveCredentials(
  name: string,
  username: string,
  password: string,
  oldPassword?: string
): Promise<boolean> {
  const authRes = await signUpExecutiveWithSupabase(name, username.trim(), password.trim(), oldPassword);
  if (!authRes.success) {
    throw new Error(authRes.error || "Failed to update credentials in Supabase Auth.");
  }
  return true;
}

/**
 * Delete an executive member, unassign their shops and collections
 */
export async function deleteExecutive(id: string, name: string): Promise<boolean> {
  const cleanName = name.trim();

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

  // 4. Remove cached credentials
  removeExecutiveCredential(cleanName);

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
    .select("id, file_name, total_shops, total_items, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (error || !data) return [];
  return data.map((b: any) => ({
    id: b.id,
    fileName: b.file_name,
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
    // 1. Delete associated shop collections (cascades to collection_items)
    const { error: colErr } = await supabase
      .from("shop_collections")
      .delete()
      .eq("upload_batch_id", batchId);

    if (colErr) {
      console.error("Error deleting shop collections for batch:", colErr);
      return { success: false, error: colErr.message };
    }

    // 2. Delete the upload batch record itself
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
 * Delete a retail shop and its executive mappings
 */
export async function deleteShop(
  shopId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Database not configured" };
  const supabase = createClient();
  if (!supabase) return { success: false, error: "Supabase client unavailable" };

  try {
    // Optional: unset executive_name from shop_collections for this shop
    const { data: shopRecord } = await supabase.from("shops").select("name").eq("id", shopId).maybeSingle();
    if (shopRecord?.name) {
      await supabase.from("shop_collections").update({ executive_name: null }).eq("shop_name", shopRecord.name);
    }

    // 1. Delete associated shop mappings
    await supabase.from("shop_mappings").delete().eq("shop_id", shopId);

    // 2. Delete the shop record
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

