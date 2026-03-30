import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Lista pedidos para el dashboard.
 * Identidad: sesión vía cookies (mismo admin que /dashboard). Datos: service role para saltar RLS.
 * Sin `SUPABASE_SERVICE_ROLE_KEY`, cae en anon (comportamiento anterior sujeto a RLS).
 */
export async function GET() {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const supabase = createSupabaseJsClient(getSupabaseUrl(), serviceKey ?? getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[orders/list] total rows fetched:", data?.length);
    console.log(
      "[orders/list] order_types:",
      data?.map((o) => o.order_type)
    );
    console.log("[orders/list] statuses:", data?.map((o) => o.status));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
