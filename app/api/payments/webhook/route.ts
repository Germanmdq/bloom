import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, MerchantOrder, Payment } from "mercadopago";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";

function parseNotificationPayload(raw: string, url: URL) {
  let topic = url.searchParams.get("topic") || url.searchParams.get("type");
  let resourceId = url.searchParams.get("id") || url.searchParams.get("data.id");

  if (raw.trim()) {
    if (raw.trim().startsWith("{")) {
      try {
        const j = JSON.parse(raw) as {
          type?: string;
          topic?: string;
          action?: string;
          data?: { id?: string | number };
        };
        topic = j.type || j.topic || j.action || topic;
        if (j.data?.id != null) resourceId = String(j.data.id);
      } catch {
        /* ignore */
      }
    } else {
      const p = new URLSearchParams(raw);
      topic = p.get("topic") || p.get("type") || topic;
      resourceId = p.get("id") || p.get("data.id") || resourceId;
    }
  }

  return { topic: topic?.toLowerCase() ?? "", resourceId };
}

async function markOrderPaid(orderId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.error("[payments/webhook] Falta SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }
  const supabase = createClient(getSupabaseUrl(), serviceKey);

  // Leer el pedido para ver si tiene pago de deuda CC
  const { data: orderData } = await supabase
    .from("orders")
    .select("customer_id, debt_payment_amount")
    .eq("id", orderId)
    .maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({
      paid: true,
      status: "pending",
      payment_method: "MERCADO_PAGO",
      payment_notes: "Pagado vía Mercado Pago",
    })
    .eq("id", orderId);

  if (error) {
    console.error("[payments/webhook] update", error);
    return false;
  }

  // Reducir saldo de cuenta corriente si corresponde
  const debtAmount = Number(orderData?.debt_payment_amount ?? 0);
  const customerId = orderData?.customer_id as string | null;
  if (debtAmount > 0 && customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", customerId)
      .single();
    if (profile) {
      const currentBalance = Number(profile.balance ?? 0);
      const newBalance = Math.max(0, currentBalance - debtAmount);
      const { error: balErr } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", customerId);
      if (balErr) console.error("[payments/webhook] balance update", balErr);
    }
  }

  return true;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      console.error("[payments/webhook] sin MERCADOPAGO_ACCESS_TOKEN");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const url = new URL(request.url);
    const raw = await request.text();
    const { topic, resourceId } = parseNotificationPayload(raw, url);

    if (!resourceId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });

    let debtMetadata: { type?: string; customer_id?: string; amount?: number } | null = null;

    if (topic === "payment" || topic === "payment.updated" || topic === "payment.created") {
      const paymentApi = new Payment(mpConfig);
      const p = await paymentApi.get({ id: resourceId });
      approved = p.status === "approved";
      externalRef = p.external_reference ?? undefined;
      if (p.metadata?.type === "DEBT_PAYMENT") {
        debtMetadata = p.metadata;
      }
    } else if (topic === "merchant_order" || topic === "topic_merchant_order_wh") {
      const moApi = new MerchantOrder(mpConfig);
      const mo = await moApi.get({ merchantOrderId: resourceId });
      externalRef = mo.external_reference ?? undefined;
      approved =
        mo.order_status === "paid" ||
        Boolean(mo.payments?.some((pay) => pay.status === "approved"));
    } else {
      try {
        const paymentApi = new Payment(mpConfig);
        const p = await paymentApi.get({ id: resourceId });
        approved = p.status === "approved";
        externalRef = p.external_reference ?? undefined;
        if (p.metadata?.type === "DEBT_PAYMENT") {
          debtMetadata = p.metadata;
        }
      } catch {
        try {
          const moApi = new MerchantOrder(mpConfig);
          const mo = await moApi.get({ merchantOrderId: resourceId });
          externalRef = mo.external_reference ?? undefined;
          approved =
            mo.order_status === "paid" ||
            Boolean(mo.payments?.some((pay) => pay.status === "approved"));
        } catch {
          /* unknown topic */
        }
      }
    }

    if (approved) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      const supabaseAdmin = createClient(getSupabaseUrl(), serviceKey || "");

      // Caso 1: Pago de Deuda Directo (desde la cuenta)
      if (debtMetadata?.customer_id && debtMetadata.amount) {
        const cid = debtMetadata.customer_id;
        const amt = Number(debtMetadata.amount);
        
        console.log(`[Webhook] Procesando DEBT_PAYMENT para ${cid}: ${amt}`);
        
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", cid)
          .single();

        if (profile) {
          const newBalance = Math.max(0, Number(profile.balance ?? 0) - amt);
          await supabaseAdmin
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", cid);
          console.log(`[Webhook] Balance actualizado: ${newBalance}`);
        }
      } 
      // Caso 2: Pedido Normal (que puede o no tener deuda incluida)
      else if (externalRef && /^[0-9a-f-]{36}$/i.test(externalRef)) {
        await markOrderPaid(externalRef);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[payments/webhook]", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
