"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "assistant" | "user"; content: string };

export type BloomChatHandle = {
  /** Abre el panel y envía el nombre de categoría como primer mensaje de usuario (tras el saludo). */
  openWithCategoryMessage: (categoryName: string) => void;
};

function tryParseOrderPayload(text: string): {
  order_ready: boolean;
  customer_name: string;
  customer_phone: string;
  service: "takeaway" | "salon";
  items: Array<{ product_id: string; name: string; price: number; quantity: number }>;
} | null {
  const idx = text.lastIndexOf("\"order_ready\"");
  if (idx === -1) return null;
  const start = text.lastIndexOf("{", idx);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      order_ready?: boolean;
      customer_name?: string;
      customer_phone?: string;
      service?: string;
      items?: Array<{ product_id: string; name: string; price: number; quantity: number }>;
    };
    if (!parsed.order_ready || !parsed.items?.length) return null;
    const service: "takeaway" | "salon" = parsed.service === "salon" ? "salon" : "takeaway";
    return {
      order_ready: true,
      customer_name: String(parsed.customer_name ?? "").trim(),
      customer_phone: String(parsed.customer_phone ?? "").trim(),
      service,
      items: parsed.items,
    };
  } catch {
    return null;
  }
}

function assistantDisplayText(raw: string): string {
  const orderIdx = raw.lastIndexOf("\"order_ready\"");
  if (orderIdx === -1) return raw;
  const start = raw.lastIndexOf("{", orderIdx);
  if (start === -1) return raw;
  return raw.slice(0, start).trim();
}

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

async function streamOpeningMessage(
  clientTimeISO: string,
  onDelta: (full: string) => void
): Promise<void> {
  const res = await fetch("/api/bloom-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "opening", clientTimeISO }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Error al abrir el chat");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Sin respuesta");
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
}

type OrderPayload = NonNullable<ReturnType<typeof tryParseOrderPayload>>;

export const BloomChat = forwardRef<BloomChatHandle>(function BloomChat(_props, ref) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loadingOpening, setLoadingOpening] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [accountGate, setAccountGate] = useState(false);
  const pendingPayloadRef = useRef<OrderPayload | null>(null);
  const pendingUserMessageRef = useRef<string | null>(null);
  const openingStarted = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSubmitSentRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const loadOpening = useCallback(async () => {
    setLoadingOpening(true);
    setMessages([{ role: "assistant", content: "" }]);
    try {
      await streamOpeningMessage(new Date().toISOString(), (full) => {
        setMessages([{ role: "assistant", content: assistantDisplayText(full) }]);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar el mozo virtual");
      setMessages([
        {
          role: "assistant",
          content:
            "Se trabó el saludo. Probá de nuevo en un ratito — en Bloom estamos para lo que necesites.",
        },
      ]);
    } finally {
      setLoadingOpening(false);
    }
  }, []);

  useEffect(() => {
    if (openingStarted.current) return;
    openingStarted.current = true;
    void loadOpening();
  }, [loadOpening]);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 3000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  const submitConfirm = useCallback(
    async (payload: OrderPayload, accessToken?: string, opts?: { skipDedupe?: boolean }) => {
      const dedupeKey = JSON.stringify(payload.items.map((i) => i.product_id).sort()) + payload.customer_name;
      if (!opts?.skipDedupe && autoSubmitSentRef.current === dedupeKey) {
        return;
      }
      autoSubmitSentRef.current = dedupeKey;

      const res = await fetch("/api/bloom-chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payload.items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          service: payload.service,
          ...(accessToken ? { access_token: accessToken } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        autoSubmitSentRef.current = null;
        toast.error((data as { error?: string }).error || "Error al guardar el pedido");
        return;
      }

      const total = payload.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
      const lines = payload.items.map((i) => `${i.quantity}× ${i.name} (${formatArs(Number(i.price) * i.quantity)})`);
      const confirmation =
        "Pedido enviado, te esperamos.\n\n" + lines.join("\n") + `\n\nTotal: ${formatArs(total)}`;

      setMessages((prev) => [...prev, { role: "assistant", content: confirmation }]);
      toast.success("Pedido registrado");
      setAccountGate(false);
      pendingPayloadRef.current = null;
      setOpen(false);
    },
    []
  );

  const runAutoSubmit = useCallback(
    async (payload: OrderPayload) => {
      if (payload.service === "takeaway" && !payload.customer_phone) {
        toast.error("Para llevar necesitamos un teléfono. Pedile al mozo que lo anote.");
        autoSubmitSentRef.current = null;
        return;
      }
      if (!payload.customer_name) {
        toast.error("Falta el nombre en el pedido.");
        autoSubmitSentRef.current = null;
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        pendingPayloadRef.current = payload;
        setAccountGate(true);
        return;
      }
      await submitConfirm(payload, session.access_token, { skipDedupe: true });
    },
    [submitConfirm, supabase]
  );

  const finalizeAssistantMessage = useCallback(
    async (fullRaw: string) => {
      const payload = tryParseOrderPayload(fullRaw);
      const visible = assistantDisplayText(fullRaw);

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy.length - 1;
        if (last >= 0 && copy[last].role === "assistant") {
          copy[last] = { role: "assistant", content: visible };
        }
        return copy;
      });

      if (!payload) return;

      const dedupeKey = JSON.stringify(payload.items.map((i) => i.product_id).sort()) + payload.customer_name;
      if (autoSubmitSentRef.current === dedupeKey) return;

      await runAutoSubmit(payload);
    },
    [runAutoSubmit]
  );

  const runChatCompletion = useCallback(
    async (nextMessages: Msg[]) => {
      const clientTimeISO = new Date().toISOString();
      const res = await fetch("/api/bloom-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTimeISO,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        toast.error("No se pudo enviar el mensaje");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const display = assistantDisplayText(assistant);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: display };
          return copy;
        });
      }

      await finalizeAssistantMessage(assistant);
    },
    [finalizeAssistantMessage]
  );

  const sendUserMessageWithText = useCallback(
    async (trimmed: string) => {
      if (!trimmed || streaming || loadingOpening) return;
      setStreaming(true);
      try {
        const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
        setMessages(nextMessages);
        await runChatCompletion(nextMessages);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, loadingOpening, runChatCompletion]
  );

  useImperativeHandle(ref, () => ({
    openWithCategoryMessage: (categoryName: string) => {
      const t = categoryName.trim();
      if (!t) return;
      pendingUserMessageRef.current = t;
      setOpen(true);
    },
  }));

  useEffect(() => {
    if (!open || loadingOpening || streaming) return;
    const msg = pendingUserMessageRef.current;
    if (!msg) return;
    pendingUserMessageRef.current = null;
    void sendUserMessageWithText(msg);
  }, [open, loadingOpening, streaming, sendUserMessageWithText]);

  const sendUserMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || loadingOpening) return;
    setInput("");
    await sendUserMessageWithText(trimmed);
  };

  const onTakeawayGuest = async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    await submitConfirm(payload, undefined, { skipDedupe: true });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#7a765a] text-white shadow-[0_10px_40px_-8px_rgba(45,74,62,0.55)] ring-2 ring-white/30 transition hover:bg-[#5f5c46] hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]"
        aria-label="Abrir chat Bloom"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
      </button>

      {accountGate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-[#e8e4dc] bg-[#f7f5ef] p-5 shadow-2xl">
            <p className="font-black text-neutral-900">¿Asociamos el pedido a tu cuenta?</p>
            <p className="mt-2 text-sm text-neutral-600">
              Si iniciás sesión, lo vas a ver en <strong>Mi cuenta</strong> con tu historial y beneficios.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2d4a3e] px-4 py-3 text-center text-sm font-black uppercase text-white"
              >
                <User className="h-4 w-4" /> Iniciar sesión
              </Link>
              <button
                type="button"
                onClick={() => void onTakeawayGuest()}
                className="rounded-xl border border-[#d4cfc4] bg-white px-4 py-3 text-sm font-bold text-neutral-800"
              >
                Continuar como invitado
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountGate(false);
                  pendingPayloadRef.current = null;
                  autoSubmitSentRef.current = null;
                }}
                className="text-xs font-bold text-neutral-400 hover:text-neutral-600"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed bottom-24 right-6 z-[101] flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-[#e8e4dc] bg-[#f7f5ef] shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-[#e0dcd4] bg-[#2d4a3e] px-4 py-3 text-white">
            <div className="flex items-center gap-2 font-bold tracking-tight">
              <MessageCircle className="h-5 w-5 text-[#c4b896]" />
              Bloom — tu mozo
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto px-3 py-3">
            {loadingOpening && messages.length === 1 && messages[0].content === "" && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Tu mozo te está saludando…
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-[#7a765a] text-white"
                    : "mr-auto bg-white text-neutral-800 shadow-sm ring-1 ring-black/5"
                }`}
              >
                {(m.role === "assistant" ? assistantDisplayText(m.content) : m.content).split("\n").map((line, li, arr) => (
                  <span key={li}>
                    {line}
                    {li < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </div>
            ))}
            {streaming && (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Escribiendo…
              </div>
            )}
          </div>

          <div className="border-t border-[#e0dcd4] p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendUserMessage()}
                placeholder="Escribile a tu mozo..."
                disabled={streaming || loadingOpening}
                className="min-w-0 flex-1 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#7a765a] focus:outline-none focus:ring-2 focus:ring-[#c4b896]/50"
              />
              <button
                type="button"
                onClick={() => void sendUserMessage()}
                disabled={streaming || loadingOpening || !input.trim()}
                className="shrink-0 rounded-xl bg-[#7a765a] px-3 py-2 text-white hover:bg-[#5f5c46] disabled:opacity-40"
                aria-label="Enviar"
              >
                {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
