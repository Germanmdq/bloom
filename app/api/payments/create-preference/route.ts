import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";

const NOTIFICATION_URL = "https://www.bloommdp.com/api/payments/webhook";
const PRODUCTION_SITE = "https://www.bloommdp.com";

type CreatePreferenceBody = {
  items?: Array<{ title: string; quantity: number; unit_price: number }>;
  customer?: { name?: string; phone?: string };
  order_id: string;
  /** Monto de deuda CC incluido en el pago. */
  debt_payment_amount?: number;
};

type OrderRow = {
  id: string;
  total: number | string;
  items: unknown;
  status: string | null;
  paid: boolean;
  customer_name: string | null;
  customer_phone: string | null;
};

function normalizePhoneForPayer(phone: string): { area_code?: string; number?: string } | undefined {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length >= 10) {
    return { area_code: digits.slice(0, 2), number: digits.slice(2) };
  }
  return { number: digits };
}

export async function POST(req: Request) {
  try {
    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN en el servidor" }, { status: 500 });
    }

    const body = (await req.json()) as CreatePreferenceBody;
    const orderId = body.order_id?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "order_id requerido" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY para validar el pedido" }, { status: 500 });
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey);
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id,total,items,status,paid,customer_name,customer_phone")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error("[payments/create-preference] order", orderErr);
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const row = order as OrderRow;
    if (row.paid) {
      return NextResponse.json({ error: "Este pedido ya está pagado" }, { status: 400 });
    }
    if (row.status !== "pending_payment") {
      return NextResponse.json({ error: "El pedido no está pendiente de pago online" }, { status: 400 });
    }

    const rawItems = Array.isArray(row.items) ? row.items : [];
    type Line = { name?: string; price?: number; quantity?: number };
    const lines = rawItems as Line[];
    if (!lines.length) {
      return NextResponse.json({ error: "El pedido no tiene ítems" }, { status: 400 });
    }

    const mpItems: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: "ARS";
    }> = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const title = String(line.name ?? "Producto").slice(0, 256);
      const quantity = Math.max(1, Number(line.quantity) || 1);
      const unit_price = Number(line.price);
      if (!Number.isFinite(unit_price) || unit_price < 0) {
        return NextResponse.json({ error: "Precio inválido en el pedido" }, { status: 400 });
      }
      mpItems.push({
        id: String(idx + 1),
        title,
        quantity,
        unit_price,
        currency_id: "ARS",
      });
    }

    const sumItemsDb = mpItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const totalDb = Number(row.total);
    const debtAmount = Number(body.debt_payment_amount ?? 0);

    // Si hay deuda incluida, agregar ítem de pago CC a MercadoPago
    if (debtAmount > 0) {
      mpItems.push({
        id: String(mpItems.length + 1),
        title: "Pago Cuenta Corriente",
        quantity: 1,
        unit_price: debtAmount,
        currency_id: "ARS",
      });
    }

    const sumAll = mpItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    if (Math.abs(sumAll - totalDb) > 0.05) {
      return NextResponse.json({ error: "Total del pedido inconsistente" }, { status: 400 });
    }

    // Validación ítems del body (sin contar deuda) solo si no tiene deuda
    if (body.items?.length && debtAmount <= 0) {
      const sumReq = body.items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
      if (Math.abs(sumReq - totalDb) > 0.05) {
        return NextResponse.json({ error: "Los ítems enviados no coinciden con el pedido" }, { status: 400 });
      }
    }

    const payerName = (body.customer?.name ?? row.customer_name ?? "Cliente").trim() || "Cliente";
    const payerPhoneRaw = (body.customer?.phone ?? row.customer_phone ?? "").trim();
    const phoneObj = payerPhoneRaw ? normalizePhoneForPayer(payerPhoneRaw) : undefined;

    const baseUrl = (process.env.NEXT_PUBLIC_URL ?? PRODUCTION_SITE).replace(/\/$/, "");

    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
    const preference = new Preference(mpConfig);

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: payerName,
          ...(phoneObj ? { phone: phoneObj } : {}),
        },
        back_urls: {
          success: `${baseUrl}/menu?payment=success`,
          failure: `${baseUrl}/menu?payment=failure`,
          pending: `${baseUrl}/menu?payment=pending`,
        },
        auto_return: "approved",
        external_reference: orderId,
        notification_url: NOTIFICATION_URL,
        statement_descriptor: "BLOOM CAFE",
      },
    });

    const initPoint = result.init_point ?? result.sandbox_init_point;
    if (!initPoint) {
      console.error("[payments/create-preference] sin init_point", result);
      return NextResponse.json({ error: "Mercado Pago no devolvió URL de pago" }, { status: 502 });
    }

    return NextResponse.json({ init_point: initPoint, preference_id: result.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[payments/create-preference]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
