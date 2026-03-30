"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Phone, Store } from "lucide-react";
import { toast } from "sonner";
import type { BloomChatCartLine, BloomMenuCheckoutBridge } from "@/lib/bloom-chat-types";

type Msg = { role: "assistant" | "user"; content: string };

function tryParseOrderPayload(text: string): {
  order_ready: boolean;
  customer_name: string;
  customer_phone: string;
  items: Array<{ product_id: string; name: string; price: number; quantity: number }>;
} | null {
  const idx = text.lastIndexOf('"order_ready"');
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
      items?: Array<{ product_id: string; name: string; price: number; quantity: number }>;
    };
    if (!parsed.order_ready || !parsed.items?.length) return null;
    return {
      order_ready: true,
      customer_name: String(parsed.customer_name ?? "").trim(),
      customer_phone: String(parsed.customer_phone ?? "").trim(),
      items: parsed.items,
    };
  } catch {
    return null;
  }
}

export function BloomChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const greetingLoaded = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const loadGreeting = useCallback(async () => {
    if (greetingLoaded.current) return;
    setLoadingGreeting(true);
    try {
      const res = await fetch("/api/bloom-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "greeting", clientTimeISO: new Date().toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Error al cargar saludo");
      }
      const data = (await res.json()) as { greeting: string };
      greetingLoaded.current = true;
      setMessages([{ role: "assistant", content: data.greeting }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el chat");
      setMessages([
        {
          role: "assistant",
          content:
            "¡Hola! Soy el asistente de Bloom. Contame qué querés pedir y te ayudo con el menú y los precios.",
        },
      ]);
      greetingLoaded.current = true;
    } finally {
      setLoadingGreeting(false);
    }
  }, []);

  useEffect(() => {
    if (open && !greetingLoaded.current) void loadGreeting();
  }, [open, loadGreeting]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  const sendUserMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    const clientTimeISO = new Date().toISOString();
    const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/bloom-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        clientTimeISO,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      setStreaming(false);
      toast.error("No se pudo enviar el mensaje");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setStreaming(false);
      return;
    }

    const decoder = new TextDecoder();
    let assistant = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistant += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: assistant };
        return copy;
      });
    }
    setStreaming(false);
  };

  const bridge = (): BloomMenuCheckoutBridge | undefined =>
    typeof window !== "undefined"
      ? (window as unknown as { __bloomMenuCheckout?: BloomMenuCheckoutBridge }).__bloomMenuCheckout
      : undefined;

  const onWhatsApp = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    const payload = tryParseOrderPayload(last.content);
    if (!payload?.items?.length) {
      toast.error("No encontré un pedido confirmado en el último mensaje. Pedile al asistente que confirme el pedido.");
      return;
    }
    const lines: BloomChatCartLine[] = payload.items.map((i) => ({
      id: i.product_id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity),
      variants: [],
      observations: "",
    }));
    const b = bridge();
    if (b?.handleWhatsAppCheckoutWithCart) {
      b.handleWhatsAppCheckoutWithCart(lines);
      toast.success("Abrimos WhatsApp con tu pedido");
      setOpen(false);
    } else {
      toast.error("No está disponible el checkout todavía. Recargá la página.");
    }
  };

  const onTakeaway = async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    const payload = tryParseOrderPayload(last.content);
    if (!payload?.items?.length || !payload.customer_name || !payload.customer_phone) {
      toast.error("Falta nombre o teléfono en el pedido confirmado.");
      return;
    }
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
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error || "Error al guardar el pedido");
      return;
    }
    toast.success("Pedido registrado. ¡Gracias!");
    setOpen(false);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const pendingOrder = lastAssistant ? tryParseOrderPayload(lastAssistant.content) : null;

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

      {open && (
        <div className="fixed bottom-24 right-6 z-[101] flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-[#e8e4dc] bg-[#f7f5ef] shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-[#e0dcd4] bg-[#2d4a3e] px-4 py-3 text-white">
            <div className="flex items-center gap-2 font-bold tracking-tight">
              <MessageCircle className="h-5 w-5 text-[#c4b896]" />
              Bloom — pedidos
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
            {loadingGreeting && messages.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Preparando tu saludo…
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
                {m.content.split("\n").map((line, li) => (
                  <span key={li}>
                    {line}
                    {li < m.content.split("\n").length - 1 ? <br /> : null}
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

          {pendingOrder?.order_ready && pendingOrder.items.length > 0 && (
            <div className="border-t border-[#e0dcd4] bg-white/80 px-3 py-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5f5c46]">Pedido detectado</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onWhatsApp}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-xs font-black uppercase text-white hover:brightness-105"
                >
                  <Phone className="h-4 w-4" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={onTakeaway}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7a765a] px-3 py-2.5 text-xs font-black uppercase text-white hover:bg-[#5f5c46]"
                >
                  <Store className="h-4 w-4" /> Pedido en local
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-[#e0dcd4] p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendUserMessage()}
                placeholder="Escribí tu mensaje…"
                disabled={streaming || loadingGreeting}
                className="min-w-0 flex-1 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#7a765a] focus:outline-none focus:ring-2 focus:ring-[#c4b896]/50"
              />
              <button
                type="button"
                onClick={() => void sendUserMessage()}
                disabled={streaming || loadingGreeting || !input.trim()}
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
}
