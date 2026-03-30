import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Marcar pedido como pagado / impago (dashboard staff; usa service role si está definido). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string; paid?: boolean };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }
    const paid = Boolean(body.paid);

    const url = getSupabaseUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getSupabaseAnonKey();
    const supabase = createClient(url, key);

    const { error } = await supabase.from("orders").update({ paid }).eq("id", orderId);

    if (error) {
      console.error("[orders/paid]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
