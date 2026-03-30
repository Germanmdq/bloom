import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "llama3-70b-8192";

/** Mensaje "vacío" del cliente para el primer turno (Groq no acepta content totalmente vacío). */
const OPENING_USER_PLACEHOLDER = "\u200b";

function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function timeOfDayLabel(clientTimeISO: string): "mañana" | "tarde" | "noche" {
  const h = new Date(clientTimeISO).getHours();
  if (h < 12) return "mañana";
  if (h < 20) return "tarde";
  return "noche";
}

/** Franja para sugerencias de mozo (desayuno / almuerzo / merienda / cena). */
function mealSuggestionLine(clientTimeISO: string): string {
  const h = new Date(clientTimeISO).getHours();
  if (h >= 5 && h < 11) return "Es mañana: priorizá desayuno, café, medialunas, tostadas.";
  if (h >= 11 && h < 15) return "Es mediodía: priorizá platos, menú del día, algo copado para almorzar.";
  if (h >= 15 && h < 19) return "Es tarde: merienda, café con algo dulce o salado, algo liviano.";
  if (h >= 19 && h < 24) return "Es noche: priorizá cena, platos más contundentes, algo para cerrar el día.";
  return "Madrugada o horario raro: ofrecé café, algo liviano o lo clásico de la carta.";
}

type MenuCtx = {
  menuText: string;
  platoBlock: string;
  topSellersBlock: string;
  tod: "mañana" | "tarde" | "noche";
  mealLine: string;
};

async function loadMenuContext(clientTimeISO: string): Promise<MenuCtx> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  const tod = timeOfDayLabel(clientTimeISO);
  const mealLine = mealSuggestionLine(clientTimeISO);

  const [{ data: categories }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name, sort_order").order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, description, price, category_id, active, options")
      .eq("active", true)
      .order("name"),
    supabase.from("app_settings").select("plato_del_dia_id").eq("id", 1).maybeSingle(),
  ]);

  const catMap = new Map<string, string>();
  for (const c of categories ?? []) {
    catMap.set(c.id, c.name);
  }

  const productList = products ?? [];
  const platoId = settings?.plato_del_dia_id ?? null;
  let platoBlock =
    "Hoy no hay plato del día cargado en el sistema. No inventes uno; decilo si preguntan.";
  if (platoId) {
    const plato = productList.find((x) => x.id === platoId);
    if (plato) {
      platoBlock = `Plato del día de hoy: "${plato.name}" a ${formatArs(Number(plato.price))} (id producto: ${platoId}). En el PRIMER mensaje siempre nombralo con el precio.`;
    }
  }

  let topSellersBlock = "No hay datos de lo más pedido todavía.";
  const { data: topCatsBySales, error: salesErr } = await supabase
    .from("categories")
    .select("id, name, sales_count")
    .order("sales_count", { ascending: false, nullsFirst: false })
    .limit(3);

  let topCatIds: { id: string; name: string }[] = [];
  if (!salesErr && topCatsBySales?.length) {
    topCatIds = topCatsBySales.map((c) => ({ id: c.id, name: c.name }));
  } else {
    topCatIds = (categories ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name }));
  }

  const topSellerLines: string[] = [];
  for (const cat of topCatIds) {
    const inCat = productList.filter((p) => p.category_id === cat.id);
    const pick = inCat.sort((a, b) => a.name.localeCompare(b.name, "es"))[0];
    if (pick) {
      topSellerLines.push(`"${pick.name}" (${cat.name}) ${formatArs(Number(pick.price))} [id: ${pick.id}]`);
    }
  }
  if (topSellerLines.length) {
    topSellersBlock = `Lo más pedido últimamente (referencia, podés mencionar uno o dos si encaja): ${topSellerLines.join("; ")}.`;
  }

  const lines: string[] = [];
  for (const p of productList) {
    const cat = catMap.get(p.category_id) ?? "General";
    const isPlato = platoId && p.id === platoId;
    const desc = (p.description || "").trim();
    const opts = p.options != null ? ` Opciones: ${JSON.stringify(p.options)}` : "";
    lines.push(
      `[${cat}] ${p.name} — ${formatArs(Number(p.price))}${isPlato ? " (PLATO DEL DÍA)" : ""}${desc ? ` — ${desc}` : ""}${opts} [id: ${p.id}]`
    );
  }

  const menuText = lines.join("\n");

  return {
    menuText,
    platoBlock,
    topSellersBlock,
    tod,
    mealLine,
  };
}

function buildSystemPrompt(ctx: MenuCtx, clientTimeISO: string, opts: { openingAppend?: string }) {
  const openingAppend =
    opts.openingAppend ??
    "";

  return `You are the virtual waiter of Bloom Café & More in Mar del Plata (Bárbara y Agustín).
You speak casual Argentine Spanish (vos, che, bárbaro, dale).
You are warm, quick and never generic.

Your job is to guide the customer through ordering, not wait for them.

Clock (client): ${clientTimeISO}. Time of day word: ${ctx.tod} (use for greeting: buenos días / buenas tardes / buenas noches when it fits).
${ctx.mealLine}

Today's special and bestsellers (use these facts, don't invent others):
${ctx.platoBlock}
${ctx.topSellersBlock}

Full menu for reference (prices ARS; only recommend what appears here; never invent prices or dishes):
${ctx.menuText}

How you behave (your replies to the customer, not this list format): Always mention today's special with its price in the FIRST message if the facts above include a plato del día; if there isn't one, don't invent it. Suggest based on time of day using the meal hint. If they say something vague like "qué hay?" give exactly three concrete options with prices in flowing prose, not the whole menu. When they pick something, confirm and ask if they want anything else. When they're done, ask their name and if it's para llevar or para comer acá. Then give the total and confirm. Write like speech: no lines starting with hyphen or asterisk, no bullet lists. Avoid "¡Claro!", "¡Por supuesto!" and "¿En qué puedo ayudarte?".

When the customer explicitly confirms the final order ("listo", "confirmo", "dale", "mandá", etc.), reply with a short closing in natural prose AND in the SAME message include a single JSON object (no markdown code fence) exactly like:
{"order_ready":true,"customer_name":"...","customer_phone":"...","service":"takeaway"|"salon","items":[{"product_id":"uuid","name":"...","price":1234,"quantity":1}]}
Use customer_phone empty string if they didn't give a number but confirmed; prefer asking for a contact if takeaway. service: "takeaway" para llevar, "salon" para comer en el local.
Prices and names must match the menu. If something is missing, ask before emitting JSON.
If the order is not confirmed, do not include order_ready true.${openingAppend}`;
}

function streamGroqText(completion: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) controller.enqueue(encoder.encode(content));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const groq = getGroq();
  if (!groq) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY no configurada" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    mode?: "opening" | "chat";
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
    clientTimeISO?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientTimeISO = body.clientTimeISO || new Date().toISOString();
  const ctx = await loadMenuContext(clientTimeISO);
  const openingAppend =
    body.mode === "opening"
      ? `\n\nOPENING TURN: The customer has not spoken yet. You open the conversation alone. One message only: greet for the time of day, mention today's special with price (if configured), tease something from the top sellers if natural, and invite them to order. Three to five short sentences. Seductive waiter energy, not a support bot.`
      : "";

  const systemContent = buildSystemPrompt(ctx, clientTimeISO, { openingAppend });

  if (body.mode === "opening") {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.85,
      max_tokens: 400,
      stream: true,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: OPENING_USER_PLACEHOLDER },
      ],
    });
    return new Response(streamGroqText(completion), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const messages = body.messages ?? [];
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
    messages: [{ role: "system", content: systemContent }, ...messages],
  });

  return new Response(streamGroqText(completion), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
