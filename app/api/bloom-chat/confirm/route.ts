import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type ConfirmBody = {
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  customer_name: string;
  customer_phone: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfirmBody;
    const { items, customer_name, customer_phone } = body;
    if (!items?.length || !customer_name?.trim() || !customer_phone?.trim()) {
      return NextResponse.json({ error: "Faltan datos del pedido o del cliente" }, { status: 400 });
    }

    const total = items.reduce((acc, i) => acc + Number(i.price) * Number(i.quantity), 0);
    const itemsJson = items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity),
    }));

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

    const { error } = await supabase.from("orders").insert({
      table_id: null,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      delivery_type: "local",
      delivery_info: "Pedido asistente Bloom (chat)",
      items: itemsJson,
      total,
      status: "pending",
      order_type: "takeaway",
    });

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
