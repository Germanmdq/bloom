import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "llama3-70b-8192";

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

async function loadMenuContext() {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

  const [{ data: categories }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order", { ascending: true }),
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

  const platoId = settings?.plato_del_dia_id ?? null;
  let platoName: string | null = null;
  if (platoId && products) {
    const p = products.find((x) => x.id === platoId);
    platoName = p?.name ?? null;
  }

  const lines: string[] = [];
  for (const p of products ?? []) {
    const cat = catMap.get(p.category_id) ?? "General";
    const isPlato = platoId && p.id === platoId;
    const desc = (p.description || "").trim();
    const opts = p.options != null ? ` Opciones/variantes: ${JSON.stringify(p.options)}` : "";
    lines.push(
      `- [${cat}] ${p.name} — ${formatArs(Number(p.price))}${isPlato ? " ★ PLATO DEL DÍA (hoy) ★" : ""}${desc ? ` — ${desc}` : ""}${opts}`
    );
  }

  const menuText = lines.join("\n");
  const specialBlock =
    platoId && platoName
      ? `El plato del día de hoy es: "${platoName}" (id: ${platoId}). Destacalo siempre que el cliente pregunte por promos o el especial.`
      : "No hay plato del día configurado hoy en el sistema.";

  return { menuText, specialBlock, platoId, platoName };
}

function buildSystemPrompt(opts: {
  menuText: string;
  specialBlock: string;
  tod: "mañana" | "tarde" | "noche";
  clientTimeISO: string;
}) {
  return `Sos el asistente virtual de Bloom Coffee & More, cafetería familiar en Mar del Plata (Bárbara y Agustín). Habla en español argentino, tono cálido, casual y breve. No seas robótico.

Contexto horario (reloj del cliente): ${opts.clientTimeISO}. Es por la ${opts.tod} — saludá acorde (buenos días / buenas tardes / buenas noches) solo cuando arranques o si el cliente saluda.

${opts.specialBlock}

MENÚ COMPLETO (precios en ARS, solo podés recomendar y cotizar lo que aparece acá):
${opts.menuText}

Reglas:
- No inventes productos ni precios.
- Si el cliente pide algo que no está, decilo con amabilidad y sugerí algo parecido del menú.
- Para armar un pedido, pedí nombre y teléfono antes de confirmar.
- Cuando el cliente confirme el pedido explícitamente ("listo", "confirmo", "dale mandá", etc.), respondé con un mensaje corto de cierre Y en la MISMA respuesta incluí un bloque JSON (sin markdown code fence, solo el objeto) con esta forma exacta:
{"order_ready":true,"customer_name":"...","customer_phone":"...","items":[{"product_id":"uuid","name":"...","price":1234,"quantity":1}]}
Los precios y nombres deben coincidir con el menú. Si falta dato, pedilo antes de emitir el JSON.

Si todavía no confirma, NO envíes order_ready en el JSON.`;
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
    mode?: "greeting" | "chat";
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
  const tod = timeOfDayLabel(clientTimeISO);
  const { menuText, specialBlock } = await loadMenuContext();

  const systemContent = buildSystemPrompt({ menuText, specialBlock, tod, clientTimeISO });

  if (body.mode === "greeting") {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 280,
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content:
            "Generá UN solo mensaje de bienvenida: saludo según la hora, mencioná Bloom, invitá a pedir algo del menú y nombrá el plato del día si existe. No uses frases genéricas tipo '¿en qué puedo ayudarte?'. Máximo 4 oraciones.",
        },
      ],
    });
    const greeting = completion.choices[0]?.message?.content?.trim() ?? "¡Hola! Soy el asistente de Bloom — ¿qué te gustaría pedir hoy?";
    return new Response(JSON.stringify({ greeting }), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const messages = body.messages ?? [];
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.65,
    max_tokens: 1024,
    stream: true,
    messages: [{ role: "system", content: systemContent }, ...messages],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
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

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
