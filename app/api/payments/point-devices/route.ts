import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pointListDevices } from "@/lib/mercadopago-point";

/**
 * Lista los terminales Point asociados a la cuenta (para configurar MERCADOPAGO_DEVICE_ID).
 * Solo staff con email admin del panel.
 */
export async function GET() {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resp = await pointListDevices();
    const body = (await resp.json().catch(() => ({}))) as unknown;
    if (!resp.ok) {
      return NextResponse.json(
        { error: "No se pudo listar dispositivos Point", details: body },
        { status: resp.status === 401 ? 401 : 502 }
      );
    }

    return NextResponse.json(body);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("Falta MERCADOPAGO")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    console.error("[point-devices]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
