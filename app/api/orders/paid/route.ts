import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marcar pedido como pagado / impago / cuenta corriente (dashboard staff; RLS orders_staff_update). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      paid?: boolean;
      cuenta_corriente?: boolean;
    };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

    const patch: Record<string, any> = {};
    if (typeof body.paid === "boolean") {
      patch.paid = body.paid;
      patch.status = body.paid ? "paid" : "pending";
    }
    if (typeof body.cuenta_corriente === "boolean") {
      patch.cuenta_corriente = body.cuenta_corriente;
      if (body.cuenta_corriente) patch.payment_method = "CUENTA_CORRIENTE";
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "paid o cuenta_corriente requerido" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);

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
