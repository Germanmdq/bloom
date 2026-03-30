import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type ConfirmBody = {
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    observations?: string;
  }>;
  customer_name: string;
  customer_phone: string;
  /** Retiro en local vs delivery (dashboard) */
  delivery_type: "local" | "delivery";
  delivery_address?: string;
  /** Cliente confirmó la dirección tal como está (delivery) */
  address_confirmed?: boolean;
  /** Web encargo: contra entrega → CASH; transferencia → BANK_TRANSFER */
  payment_method?: "cash_on_delivery" | "bank_transfer";
  access_token?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfirmBody;
    const { items, customer_name, customer_phone } = body;

    if (!items?.length || !customer_name?.trim()) {
      return NextResponse.json({ error: "Faltan datos del pedido o del cliente" }, { status: 400 });
    }

    const phone = (customer_phone ?? "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Necesitamos un teléfono de contacto" }, { status: 400 });
    }

    const deliveryType: "local" | "delivery" =
      body.delivery_type === "delivery" ? "delivery" : "local";

    let deliveryAddress = "";
    if (deliveryType === "delivery") {
      deliveryAddress = (body.delivery_address ?? "").trim();
      if (!deliveryAddress) {
        return NextResponse.json({ error: "Ingresá la dirección de entrega" }, { status: 400 });
      }
    }

    let customerId: string | null = null;
    if (body.access_token?.trim()) {
      const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        global: { headers: { Authorization: `Bearer ${body.access_token.trim()}` } },
      });
      const {
        data: { user },
        error: userErr,
      } = await authClient.auth.getUser();
      if (!userErr && user?.id) {
        customerId = user.id;
      }
    }

    const total = items.reduce((acc, i) => acc + Number(i.price) * Number(i.quantity), 0);
    const itemsJson = items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity),
      ...(i.observations?.trim() ? { observations: i.observations.trim() } : {}),
    }));

    const url = getSupabaseUrl();
    const anon = getSupabaseAnonKey();

    const pay =
      body.payment_method === "bank_transfer" ? ("bank_transfer" as const) : ("cash_on_delivery" as const);
    const paymentMethodDb = pay === "bank_transfer" ? "BANK_TRANSFER" : "CASH";
    const paymentNotes =
      pay === "bank_transfer" ? "Transferencia bancaria (pedido web)" : null;

    let deliveryInfo: string;
    if (deliveryType === "delivery") {
      const confirmed = body.address_confirmed === true;
      deliveryInfo = [
        deliveryAddress,
        confirmed ? "Dirección confirmada por el cliente." : "Cliente indicó que revisa o corrige la dirección.",
      ].join("\n");
    } else {
      deliveryInfo = "Retiro en local";
    }

    const insertRow: Record<string, unknown> = {
      table_id: null,
      customer_name: customer_name.trim(),
      customer_phone: phone,
      delivery_type: deliveryType,
      delivery_info: deliveryInfo,
      items: itemsJson,
      total,
      status: "pending",
      order_type: "web",
      paid: false,
      payment_method: paymentMethodDb,
      ...(paymentNotes ? { payment_notes: paymentNotes } : { payment_notes: null }),
    };

    const db =
      customerId && body.access_token?.trim()
        ? createClient(url, anon, {
            global: { headers: { Authorization: `Bearer ${body.access_token.trim()}` } },
          })
        : createClient(url, anon);

    if (customerId) {
      insertRow.customer_id = customerId;
    }

    const { error } = await db.from("orders").insert(insertRow);

    if (error) {
      console.error("[bloom-chat/confirm]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
