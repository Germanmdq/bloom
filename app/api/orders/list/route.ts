import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdminEmail } from "@/lib/auth/admin";

/**
 * Lista pedidos para el dashboard.
 * Identidad: sesión admin (mismo criterio que /dashboard). Datos: obligatorio service role (RLS no aplica a anon aquí).
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

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        {
          error:
            "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel / env). Sin ella no se pueden listar pedidos.",
          code: "MISSING_SERVICE_ROLE_KEY",
        },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3000);

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
