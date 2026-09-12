import { createClient } from "@supabase/supabase-js";
import { ShopCollection, Shop, ShopMapping } from "@/types";
import { isCancelledOrInvalidShop } from "@/lib/supabase/collections-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const executiveName = searchParams.get("executiveName")?.trim();

    if (!executiveName) {
      return Response.json({
        success: true,
        collections: [],
        shops: [],
        mappings: [],
        companies: [],
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { success: false, error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const cleanExec = executiveName.toLowerCase();

    // 0. Verify that this executive account actively exists in the database
    const { data: execRecord, error: execCheckErr } = await supabase
      .from("executives")
      .select("id, name")
      .ilike("name", executiveName.trim())
      .maybeSingle();

    if (!execRecord) {
      return Response.json(
        {
          success: false,
          accountDeleted: true,
          error: "This executive account has been deleted or deactivated by the administrator.",
        },
        { status: 403 }
      );
    }

    // 1. Fetch only collections assigned strictly to this executive
    const { data: colData, error: colErr } = await supabase
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
        brand_id,
        brand_name,
        is_paid,
        created_at,
        collection_items (
          id,
          product_name,
          quantity,
          amount,
          company_id,
          company_name,
          brand_id,
          brand_name
        )
      `)
      .ilike("executive_name", executiveName)
      .order("created_at", { ascending: false });

    if (colErr) {
      console.error("Error fetching executive collections:", colErr);
      return Response.json({ success: false, error: colErr.message }, { status: 500 });
    }

    const collections: ShopCollection[] = (colData || [])
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
        companyId: row.company_id || row.brand_id,
        companyName: row.company_name || row.brand_name,
        brandId: row.brand_id || row.company_id,
        brandName: row.brand_name || row.company_name,
        status: "mapped" as const,
        isPaid: Boolean(row.is_paid),
        items: (row.collection_items || []).map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          quantity: item.quantity,
          amount: Number(item.amount) || 0,
          companyId: item.company_id || row.company_id || row.brand_id,
          companyName: item.company_name || row.company_name || row.brand_name,
          brandId: item.brand_id || item.company_id || row.brand_id || row.company_id,
          brandName: item.brand_name || item.company_name || row.brand_name || row.company_name,
        })),
      }));

    // 2. Fetch shop mappings specifically matching this executive
    const { data: mapRows, error: mapErr } = await supabase
      .from("shop_mappings")
      .select(`
        id,
        shop_id,
        executive_id,
        company_id,
        company_name,
        brand_id,
        brand_name,
        executives:executive_id (id, name),
        shops:shop_id (id, name, company_id, company_name, brand_id, brand_name)
      `);

    if (mapErr) {
      console.error("Error fetching executive mappings:", mapErr);
    }

    const mappings: ShopMapping[] = [];
    const shopsMap = new Map<string, Shop>();

    if (mapRows) {
      for (const m of mapRows as any[]) {
        const execObj = Array.isArray(m.executives) ? m.executives[0] : m.executives;
        const execName = execObj?.name?.trim();
        if (!execName || execName.toLowerCase() !== cleanExec) continue;

        const shopObj = Array.isArray(m.shops) ? m.shops[0] : m.shops;
        const shopName = shopObj?.name?.trim();
        if (!shopName || isCancelledOrInvalidShop(shopName)) continue;

        const compId = m.company_id || m.brand_id || shopObj?.company_id || shopObj?.brand_id;
        const compName = m.company_name || m.brand_name || shopObj?.company_name || shopObj?.brand_name;

        mappings.push({
          id: m.id,
          shopId: m.shop_id,
          shopName,
          executiveId: m.executive_id,
          executiveName: execName,
          companyId: compId || undefined,
          companyName: compName || undefined,
          brandId: compId || undefined,
          brandName: compName || undefined,
          status: "mapped",
        });

        const shopKey = `${shopName.toLowerCase()}__${(compId || "").toLowerCase()}`;
        if (!shopsMap.has(shopKey)) {
          shopsMap.set(shopKey, {
            id: m.shop_id,
            name: shopName,
            assignedExecutiveName: execName,
            companyId: compId || undefined,
            companyName: compName || undefined,
            brandId: compId || undefined,
            brandName: compName || undefined,
          });
        }
      }
    }

    // Also ensure any shops that appear in the executive's collections are listed
    for (const c of collections) {
      const compId = c.companyId || c.brandId;
      const compName = c.companyName || c.brandName;
      const shopKey = `${c.shopName.toLowerCase()}__${(compId || "").toLowerCase()}`;
      if (!shopsMap.has(shopKey)) {
        shopsMap.set(shopKey, {
          id: `shop-${c.shopName.toLowerCase()}`,
          name: c.shopName,
          assignedExecutiveName: c.executiveName,
          companyId: compId || undefined,
          companyName: compName || undefined,
          brandId: compId || undefined,
          brandName: compName || undefined,
        });
      }
    }

    const shops: Shop[] = Array.from(shopsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // 3. Compute unique companies handled strictly by this executive
    const companySet = new Set<string>();
    for (const c of collections) {
      const comp = c.companyName?.trim() || c.brandName?.trim();
      if (comp) companySet.add(comp);
    }
    for (const s of shops) {
      const comp = s.companyName?.trim() || s.brandName?.trim();
      if (comp) companySet.add(comp);
    }
    for (const m of mappings) {
      const comp = m.companyName?.trim() || m.brandName?.trim();
      if (comp) companySet.add(comp);
    }
    const companies = Array.from(companySet).sort((a, b) => a.localeCompare(b));

    return Response.json({
      success: true,
      collections,
      shops,
      mappings,
      companies,
    });
  } catch (err: any) {
    console.error("Executive data API exception:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to retrieve executive data" },
      { status: 500 }
    );
  }
}
