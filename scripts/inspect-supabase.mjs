#!/usr/bin/env node
/**
 * Inspecciona el estado de Supabase: tablas, conteos, pedidos recientes y errores.
 * Uso: node scripts/inspect-supabase.mjs
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno
 * o en un archivo .env.local en la raíz del proyecto.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Cargar .env.local si existe
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey);

const sep = () => console.log("\n" + "─".repeat(60));

async function count(table, filter = {}) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { count: n, error } = await q;
  if (error) return `ERROR: ${error.message}`;
  return n ?? 0;
}

async function main() {
  console.log(`\n🔍 Inspeccionando Supabase: ${url}\n`);

  // ── 1. CONTEOS DE TABLAS PRINCIPALES ──────────────────────────
  sep();
  console.log("📊 CONTEOS DE TABLAS\n");

  const tables = [
    "orders", "products", "categories", "salon_tables",
    "kitchen_tickets", "profiles", "reservations",
  ];

  for (const t of tables) {
    const n = await count(t);
    console.log(`  ${t.padEnd(20)} ${n}`);
  }

  // ── 2. ESTADO DE MESAS ─────────────────────────────────────────
  sep();
  console.log("🪑 ESTADO DE SALON_TABLES\n");

  const { data: mesas, error: mesasErr } = await db
    .from("salon_tables")
    .select("id, status, order_type, total, updated_at")
    .order("id");

  if (mesasErr) {
    console.log("  ❌ Error:", mesasErr.message);
  } else {
    const occupied = mesas.filter((m) => m.status === "OCCUPIED");
    const byType = { LOCAL: 0, DELIVERY: 0, RETIRO: 0, other: 0 };
    for (const m of occupied) {
      const t = m.order_type ?? "other";
      if (t in byType) byType[t]++;
      else byType.other++;
    }
    console.log(`  Total mesas:    ${mesas.length}`);
    console.log(`  Ocupadas:       ${occupied.length}`);
    console.log(`  ├─ LOCAL:       ${byType.LOCAL}`);
    console.log(`  ├─ DELIVERY:    ${byType.DELIVERY}`);
    console.log(`  └─ RETIRO:      ${byType.RETIRO}`);

    if (occupied.length > 0) {
      console.log("\n  Mesas ocupadas:");
      for (const m of occupied) {
        const ago = Math.round((Date.now() - new Date(m.updated_at).getTime()) / 60000);
        console.log(`    Mesa ${String(m.id).padEnd(4)} | ${(m.order_type ?? "?").padEnd(8)} | $${m.total ?? 0} | hace ${ago} min`);
      }
    }
  }

  // ── 3. PEDIDOS RECIENTES ───────────────────────────────────────
  sep();
  console.log("📦 ÚLTIMOS 10 PEDIDOS\n");

  const { data: orders, error: ordersErr } = await db
    .from("orders")
    .select("id, created_at, table_id, order_type, delivery_type, status, paid, total, customer_name, payment_method")
    .order("created_at", { ascending: false })
    .limit(10);

  if (ordersErr) {
    console.log("  ❌ Error:", ordersErr.message);
  } else if (!orders?.length) {
    console.log("  (sin pedidos)");
  } else {
    for (const o of orders) {
      const dt = new Date(o.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
      const tipo = o.order_type ?? o.delivery_type ?? "?";
      const estado = o.paid ? "✅ PAGADO" : `⏳ ${o.status ?? "pending"}`;
      console.log(`  [${dt}] Mesa:${String(o.table_id ?? "?").padEnd(4)} ${tipo.padEnd(8)} $${o.total} | ${estado} | ${o.customer_name ?? "—"}`);
    }
  }

  // ── 4. PEDIDOS WEB SIN SLOT EN SALON_TABLES ───────────────────
  sep();
  console.log("⚠️  PEDIDOS WEB SIN SLOT EN SALON_TABLES\n");

  const { data: webOrders } = await db
    .from("orders")
    .select("id, table_id, order_type, created_at")
    .eq("order_type", "web")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: slots } = await db.from("salon_tables").select("id");
  const slotIds = new Set((slots ?? []).map((s) => s.id));

  const orphans = (webOrders ?? []).filter((o) => o.table_id != null && !slotIds.has(o.table_id));
  if (orphans.length === 0) {
    console.log("  ✅ Todos los pedidos web tienen su slot en salon_tables");
  } else {
    console.log(`  ❌ ${orphans.length} pedido(s) web sin slot:`);
    for (const o of orphans.slice(0, 10)) {
      console.log(`    id=${o.id} table_id=${o.table_id} (${new Date(o.created_at).toLocaleString("es-AR")})`);
    }
  }

  // ── 5. PRODUCTOS SIN IMAGEN ────────────────────────────────────
  sep();
  console.log("🖼️  PRODUCTOS SIN IMAGEN\n");

  const { data: prods, error: prodsErr } = await db
    .from("products")
    .select("id, name, image_url, active")
    .order("name");

  if (prodsErr) {
    console.log("  ❌ Error:", prodsErr.message);
  } else {
    const noImg = prods.filter((p) => !p.image_url?.trim());
    const inactive = prods.filter((p) => !p.active);
    console.log(`  Total productos:   ${prods.length}`);
    console.log(`  Sin imagen:        ${noImg.length}`);
    console.log(`  Inactivos:         ${inactive.length}`);
    if (noImg.length > 0) {
      console.log("\n  Productos sin imagen:");
      for (const p of noImg) {
        console.log(`    ${p.name} (${p.active ? "activo" : "inactivo"})`);
      }
    }
  }

  // ── 6. CATEGORÍAS ─────────────────────────────────────────────
  sep();
  console.log("📂 CATEGORÍAS\n");

  const { data: cats } = await db.from("categories").select("id, name").order("name");
  if (cats?.length) {
    for (const c of cats) {
      const n = await count("products", { category_id: c.id });
      console.log(`  ${c.name.padEnd(30)} ${n} productos`);
    }
  }

  // ── 7. KITCHEN TICKETS PENDIENTES ─────────────────────────────
  sep();
  console.log("🍳 KITCHEN TICKETS PENDIENTES\n");

  const { data: tickets } = await db
    .from("kitchen_tickets")
    .select("id, table_id, status, created_at")
    .neq("status", "DONE")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!tickets?.length) {
    console.log("  ✅ Sin tickets pendientes");
  } else {
    for (const t of tickets) {
      const dt = new Date(t.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
      console.log(`  Mesa ${t.table_id} | ${t.status} | ${dt}`);
    }
  }

  sep();
  console.log("\n✅ Inspección completa\n");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
