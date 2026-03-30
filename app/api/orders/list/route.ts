import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lista pedidos para el dashboard.
 * Usa la sesión del usuario (cookies) para que RLS permita a staff (`is_customer = false`)
 * leer todos los pedidos, incluidos `order_type = 'web'`.
 * No filtra por order_type: devuelve toda la tabla permitida por RLS.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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
