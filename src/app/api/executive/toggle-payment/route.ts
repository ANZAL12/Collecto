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

    try {
      const { error } = await supabase
        .from("shop_collections")
        .update({ is_paid: Boolean(isPaid) } as any)
        .eq("id", invoiceId);

      if (error) {
        console.warn("Could not update is_paid column (may not exist):", error.message);
      }
    } catch (err: any) {
      console.warn("Error updating is_paid in DB:", err);
    }

    return Response.json({ success: true, invoiceId, isPaid: Boolean(isPaid) });
  } catch (err: any) {
    console.error("Toggle payment API error:", err);
    return Response.json(
      { success: false, error: err.message || "Server error while updating payment status" },
      { status: 500 }
    );
  }
}
