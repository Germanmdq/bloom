import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

const VALID_METHODS = ["CASH", "CARD", "MERCADO_PAGO", "BANK_TRANSFER"];

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string; payment_method?: string };
    const orderId = body.orderId?.trim();
    const payment_method = body.payment_method?.trim();

    if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    if (!payment_method || !VALID_METHODS.includes(payment_method)) {
      return NextResponse.json({ error: "payment_method inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const svc = createServiceRoleClient();
    const { error } = await svc.from("orders").update({ payment_method }).eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
