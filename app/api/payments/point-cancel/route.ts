import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getMercadoPagoDeviceId, pointCancelCurrentIntent } from "@/lib/mercadopago-point";

export async function POST() {
  try {
    const supabaseSession = await createClient();
    const { data: { user }, error: userErr } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const deviceId = getMercadoPagoDeviceId();
    if (!deviceId) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_DEVICE_ID" }, { status: 500 });
    }

    const resp = await pointCancelCurrentIntent(deviceId);
    const body = await resp.json().catch(() => ({}));

    if (!resp.ok && resp.status !== 404) {
      return NextResponse.json({ error: "No se pudo cancelar el intent", details: body }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[point-cancel]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
