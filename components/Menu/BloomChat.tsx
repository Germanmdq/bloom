"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "assistant" | "user"; content: string };

export type BloomChatHandle = {
  /** Abre el modal, título = categoría, y envía contexto al asistente tras el saludo. */
  openWithCategoryMessage: (categoryName: string) => void;
  /** Abre el modal sin mensaje automático (botón flotante). */
  openChat: () => void;
};

const BLOOM_CHAT_RATE_LIMIT_MSG =
  "El asistente está descansando un momento, volvé a intentar en unos minutos.";

function isRateLimitError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { status?: number }).status === 429;
}

function categoryContextPrompt(categoryName: string) {
  return `Estoy viendo la categoría «${categoryName}». Mostráme los productos más destacados con precio en pesos argentinos, en forma breve y conversacional.`;
}

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
  onDelta: (full: string) => void,
  category?: string
): Promise<void> {
  const res = await fetch("/api/bloom-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "opening",
      clientTimeISO,
      ...(category ? { category } : {}),
    }),
  });
  console.log("[BloomChat] POST /api/bloom-chat (opening) status:", res.status, res.statusText);
  if (!res.ok) {
    if (res.status === 429) {
      throw Object.assign(new Error("rate_limited"), { status: 429 });
    }
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
  const [chatHeaderTitle, setChatHeaderTitle] = useState("Bloom");
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
    const runStream = async () => {
      await streamOpeningMessage(
        new Date().toISOString(),
        (full) => {
          setMessages([{ role: "assistant", content: assistantDisplayText(full) }]);
        },
        undefined
      );
    };
    try {
      await runStream();
    } catch (e) {
      if (isRateLimitError(e)) {
        setMessages([{ role: "assistant", content: BLOOM_CHAT_RATE_LIMIT_MSG }]);
        return;
      }
      console.error("[BloomChat] opening failed, retry in 2s", e);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await runStream();
      } catch (e2) {
        if (isRateLimitError(e2)) {
          setMessages([{ role: "assistant", content: BLOOM_CHAT_RATE_LIMIT_MSG }]);
          return;
        }
        console.error("[BloomChat] opening failed after retry", e2);
        setMessages([]);
      }
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
    scrollToBottom();
  }, [messages, streaming]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
      const category = chatHeaderTitle !== "Bloom" ? chatHeaderTitle : undefined;
      const res = await fetch("/api/bloom-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTimeISO,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          ...(category ? { category } : {}),
        }),
      });
      console.log("[BloomChat] POST /api/bloom-chat (chat) status:", res.status, res.statusText);

      if (!res.ok) {
        if (res.status === 429) {
          setMessages((prev) => [...prev, { role: "assistant", content: BLOOM_CHAT_RATE_LIMIT_MSG }]);
          return;
        }
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
    [finalizeAssistantMessage, chatHeaderTitle]
  );

  const sendUserMessageWithText = useCallback(
    async (trimmed: string, opts?: { hideUserInUi?: boolean }) => {
      if (!trimmed || streaming || loadingOpening) return;
      setStreaming(true);
      try {
        const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
        if (!opts?.hideUserInUi) {
          setMessages(nextMessages);
        }
        await runChatCompletion(nextMessages);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, loadingOpening, runChatCompletion]
  );

  const openFabChat = useCallback(() => {
    setChatHeaderTitle("Bloom");
    pendingUserMessageRef.current = null;
    setOpen(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openWithCategoryMessage: (categoryName: string) => {
        const t = categoryName.trim();
        if (!t) return;
        setChatHeaderTitle(t);
        pendingUserMessageRef.current = categoryContextPrompt(t);
        setOpen(true);
      },
      openChat: openFabChat,
    }),
    [openFabChat]
  );

  useEffect(() => {
    if (!open || loadingOpening || streaming) return;
    const msg = pendingUserMessageRef.current;
    if (!msg) return;
    pendingUserMessageRef.current = null;
    void sendUserMessageWithText(msg, { hideUserInUi: true });
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

  const closeModal = () => {
    setOpen(false);
    setChatHeaderTitle("Bloom");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openFabChat}
          className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#7a765a] text-white shadow-[0_10px_40px_-8px_rgba(45,74,62,0.55)] ring-2 ring-white/30 transition hover:bg-[#5f5c46] hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]"
          aria-label="Abrir chat Bloom"
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
        </button>
      )}

      {accountGate && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
        <div
          className="fixed inset-0 z-[190] flex items-stretch justify-center bg-[#f7f5ef] md:items-center md:bg-black/50 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bloom-chat-title"
        >
          <div className="flex h-full w-full max-w-full flex-col overflow-hidden bg-[#f7f5ef] md:h-[80vh] md:max-h-[80vh] md:max-w-[480px] md:rounded-2xl md:shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#e0dcd4] bg-[#2d4a3e] px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <MessageCircle className="h-5 w-5 shrink-0 text-[#c4b896]" aria-hidden />
                <h2 id="bloom-chat-title" className="truncate font-bold tracking-tight">
                  {chatHeaderTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                className="shrink-0 rounded-lg p-1.5 hover:bg-white/10"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
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

            <div className="shrink-0 border-t border-[#e0dcd4] bg-[#f7f5ef] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
        </div>
      )}
    </>
  );
});
