
import { createClient, isSupabaseConfigured } from "./client";
import { ShopCollection, Executive, Shop, ShopMapping } from "@/types";

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
    const totalItems = collections.reduce((acc, c) => acc + c.items.length, 0);

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
        total_shops: collections.length,
        total_items: totalItems,
      })
      .select("id")
      .single();

    if (batchError) {
      console.error("Error creating upload batch:", batchError);
      return { success: false, error: batchError.message };
    }

    const batchId = batch.id;

    // 2. Insert each parent shop collection and its child items
    for (const shop of collections) {
      const { data: parentShop, error: shopError } = await supabase
        .from("shop_collections")
        .insert({
          shop_name: shop.shopName,
          invoice_no: shop.invoiceNo,
          invoice_date: shop.invoiceDate,
          gstin_uin: shop.gstinUin,
          total_amount: shop.totalAmount,
          total_quantity: shop.totalQuantity ? String(shop.totalQuantity) : null,
          executive_name: shop.executiveName,
          upload_batch_id: batchId,
        })
        .select("id")
        .single();

      if (shopError) {
        console.error(`Error saving shop ${shop.shopName}:`, shopError);
        continue;
      }

      // 3. Insert child items for this parent shop
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
          console.error(`Error saving items for ${shop.shopName}:`, itemsError);
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

  return data.map((row: any) => ({
    id: row.id,
    shopName: row.shop_name,
    invoiceNo: row.invoice_no,
    invoiceDate: row.invoice_date || "",
    gstinUin: row.gstin_uin || "",
    totalAmount: Number(row.total_amount) || 0,
    totalQuantity: row.total_quantity,
    executiveName: row.executive_name,
    status: row.executive_name ? "mapped" : "unmapped",
    items: (row.collection_items || []).map((item: any) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      amount: Number(item.amount) || 0,
    })),
  }));
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
  return data;
}

/**
 * Fetch list of shops
 */
export async function getShops(): Promise<Shop[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

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

  return data.map((s: any) => {
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
 * Fetch shop to executive mappings
 */
export async function getShopMappings(): Promise<ShopMapping[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shop_mappings")
    .select(`
      id,
      shop_id,
      executive_id,
      shops:shop_id (name),
      executives:executive_id (name)
    `);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    shopId: row.shop_id,
    shopName: row.shops?.name || "Unknown Shop",
    executiveId: row.executive_id,
    executiveName: row.executives?.name,
    status: row.executive_id ? "mapped" : "unmapped",
  }));
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

  // 2. If executive selected, insert mapping
  if (executiveName) {
    const { data: execData } = await supabase
      .from("executives")
      .select("id")
      .eq("name", executiveName)
      .maybeSingle();

    if (execData) {
      await supabase
        .from("shop_mappings")
        .upsert(
          { shop_id: shopData.id, executive_id: execData.id },
          { onConflict: "shop_id" }
        );
    }
  }

  return {
    success: true,
    shop: {
      id: shopData.id,
      name: shopData.name,
      assignedExecutiveName: executiveName,
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
 * Update executive assignment for an existing shop
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

  const { data: execData } = await supabase
    .from("executives")
    .select("id")
    .eq("name", executiveName)
    .maybeSingle();

  if (!execData) return false;

  const { error } = await supabase
    .from("shop_mappings")
    .upsert(
      { shop_id: shopId, executive_id: execData.id },
      { onConflict: "shop_id" }
    );

  return !error;
}

/**
 * Add a new executive member
 */
export async function addExecutive(name: string): Promise<Executive | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;

  if (!isSupabaseConfigured()) return { id: `exec-${Date.now()}`, name: cleanName };
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("executives")
    .upsert({ name: cleanName }, { onConflict: "name" })
    .select("id, name")
    .single();

  if (error || !data) {
    console.error("Error adding executive:", error);
    return null;
  }
  return data;
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

