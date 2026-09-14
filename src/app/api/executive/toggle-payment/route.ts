import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, isPaid, executiveName } = body || {};

    if (!invoiceId) {
      return Response.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { success: false, error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Optional verification: verify that the invoice belongs to this executive if executiveName is provided
    if (executiveName) {
      const { data: inv } = await supabase
        .from("shop_collections")
        .select("id, executive_name")
        .eq("id", invoiceId)
        .maybeSingle();

      if (inv && inv.executive_name && inv.executive_name.toLowerCase() !== executiveName.trim().toLowerCase()) {
        return Response.json(
          { success: false, error: "Unauthorized: You can only update payment status for your own invoices." },
          { status: 403 }
        );
      }
    }

    const shouldBePaid = Boolean(isPaid);

    // 1. Persist payment status via collection_items marker (guaranteed supported in Supabase schema)
    try {
      if (shouldBePaid) {
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
    } catch (markerErr: any) {
      console.warn("Could not sync collection_items payment marker:", markerErr?.message || markerErr);
    }

    // 2. Also update native is_paid column on shop_collections if column is present in DB
    try {
      await supabase
        .from("shop_collections")
        .update({ is_paid: shouldBePaid } as any)
        .eq("id", invoiceId);
    } catch {
      // Safely ignore if column does not exist yet
    }

    return Response.json({ success: true, invoiceId, isPaid: shouldBePaid });
  } catch (err: any) {
    console.error("Toggle payment API error:", err);
    return Response.json(
      { success: false, error: err.message || "Server error while updating payment status" },
      { status: 500 }
    );
  }
}
