"use client";

import Image from "next/image";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "assistant" | "user"; content: string };

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
};

type CartLine = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

export type OpenCategoryOpts = {
  displayName: string;
  categoryId?: string | null;
  /** Ej. plato del día: cargar solo estos IDs */
  productIds?: string[];
};

export type BloomChatHandle = {
  openWithCategoryMessage: (opts: OpenCategoryOpts) => void;
  openChat: () => void;
};

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function timeGreeting(): "Buenos días" | "Buenas tardes" | "Buenas noches" {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function categoryIntro(displayName: string) {
  const t = timeGreeting();
  return `${t}! Estos son los productos de ${displayName}:`;
}

function genericIntro() {
  const t = timeGreeting();
  return `${t}! Tocá una categoría en el menú para ver productos y armar tu encargo.`;
}

function isListoMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "listo" || /^listo[!.¡?…\s]*$/i.test(text.trim());
}

type ChatContext = {
  displayName: string;
  categoryId: string | null;
  productIds: string[] | null;
};

export const BloomChat = forwardRef<BloomChatHandle>(function BloomChat(_props, ref) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"retiro" | "delivery">("retiro");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, cart, products, open, checkoutOpen]);

  useEffect(() => {
    if (!open || !context) return;

    const hasScope = (context.productIds?.length ?? 0) > 0 || !!context.categoryId;
    if (!hasScope) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        let q = supabase
          .from("products")
          .select("id,name,description,price,image_url,category_id")
          .eq("active", true);
        if (context.productIds?.length) {
          q = q.in("id", context.productIds);
        } else if (context.categoryId) {
          q = q.eq("category_id", context.categoryId);
        }
        const { data, error } = await q.order("name");
        if (cancelled) return;
        if (error) {
          console.error("[BloomChat] products", error);
          toast.error("No se pudieron cargar los productos");
          setProducts([]);
          return;
        }
        setProducts((data ?? []) as ProductRow[]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, context, supabase]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const addToCart = useCallback((p: ProductRow) => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.product_id === p.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...prev, { product_id: p.id, name: p.name, price: Number(p.price), quantity: 1 }];
    });
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Agregué ${p.name} a tu encargo. ¿Algo más?` },
    ]);
  }, []);

  const openCheckout = useCallback(() => {
    if (cart.length === 0) {
      toast.error("Agregá algo al encargo primero");
      return;
    }
    setCheckoutOpen(true);
  }, [cart.length]);

  const submitOrder = useCallback(async () => {
    const name = checkoutName.trim();
    const phone = checkoutPhone.trim();
    const address = checkoutAddress.trim();
    if (!name) {
      toast.error("Ingresá tu nombre");
      return;
    }
    if (!phone) {
      toast.error("Ingresá tu teléfono");
      return;
    }
    if (fulfillment === "delivery" && !address) {
      toast.error("Ingresá la dirección de entrega");
      return;
    }

    setSubmittingOrder(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/bloom-chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            product_id: c.product_id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
          })),
          customer_name: name,
          customer_phone: phone,
          fulfillment,
          ...(fulfillment === "delivery" ? { delivery_address: address } : {}),
          ...(session?.access_token ? { access_token: session.access_token } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Error al enviar el encargo");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: "Encargo enviado, te esperamos en Bloom!" }]);
      setCheckoutOpen(false);
      setCart([]);
      setCheckoutName("");
      setCheckoutPhone("");
      setCheckoutAddress("");
      setFulfillment("retiro");
      toast.success("Listo");
    } catch (e) {
      console.error(e);
      toast.error("Error de red");
    } finally {
      setSubmittingOrder(false);
    }
  }, [cart, checkoutName, checkoutPhone, checkoutAddress, fulfillment, supabase]);

  const sendUserMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || loadingProducts) return;
    setInput("");
    setStreaming(true);
    try {
      if (isListoMessage(trimmed)) {
        setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
        openCheckout();
        return;
      }
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, loadingProducts, openCheckout]);

  const openFabChat = useCallback(() => {
    setContext({ displayName: "Bloom", categoryId: null, productIds: null });
    setCart([]);
    setProducts([]);
    setMessages([{ role: "assistant", content: genericIntro() }]);
    setOpen(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openWithCategoryMessage: (opts: OpenCategoryOpts) => {
        const productIds = opts.productIds?.length ? opts.productIds : null;
        setContext({
          displayName: opts.displayName,
          categoryId: opts.categoryId ?? null,
          productIds,
        });
        setCart([]);
        setCheckoutOpen(false);
        setMessages([{ role: "assistant", content: categoryIntro(opts.displayName) }]);
        setOpen(true);
      },
      openChat: openFabChat,
    }),
    [openFabChat]
  );

  const closeModal = () => {
    setOpen(false);
    setContext(null);
    setCheckoutOpen(false);
  };

  const showProductGrid =
    context &&
    ((context.productIds?.length ?? 0) > 0 || !!context.categoryId) &&
    (loadingProducts || products.length > 0);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openFabChat}
          className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#7a765a] text-white shadow-[0_10px_40px_-8px_rgba(45,74,62,0.55)] ring-2 ring-white/30 transition hover:bg-[#5f5c46] hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b896]"
          aria-label="Abrir encargo Bloom"
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
        </button>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#e8e4dc] bg-[#f7f5ef] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bloom-checkout-title"
          >
            <h2 id="bloom-checkout-title" className="font-black text-neutral-900">
              Datos para tu encargo
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-neutral-500">Nombre</label>
                <input
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-neutral-500">Teléfono</label>
                <input
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                  autoComplete="tel"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillment("retiro")}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-black uppercase ${
                    fulfillment === "retiro" ? "bg-[#2d4a3e] text-white" : "bg-white text-neutral-600 ring-1 ring-[#d4cfc4]"
                  }`}
                >
                  Retiro en local
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillment("delivery")}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-black uppercase ${
                    fulfillment === "delivery" ? "bg-[#2d4a3e] text-white" : "bg-white text-neutral-600 ring-1 ring-[#d4cfc4]"
                  }`}
                >
                  Delivery
                </button>
              </div>
              {fulfillment === "delivery" && (
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Dirección</label>
                  <textarea
                    value={checkoutAddress}
                    onChange={(e) => setCheckoutAddress(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                    placeholder="Calle, número, piso…"
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={submittingOrder}
                onClick={() => void submitOrder()}
                className="rounded-xl bg-[#7a765a] px-4 py-3 text-sm font-black uppercase text-white hover:bg-[#5f5c46] disabled:opacity-50"
              >
                {submittingOrder ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Confirmar encargo"}
              </button>
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-4 py-2 text-center text-xs font-bold text-neutral-700"
              >
                <User className="h-3.5 w-3.5" /> Asociar a mi cuenta
              </Link>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
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
                  {context?.displayName ?? "Bloom"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                className="shrink-0 rounded-lg p-1.5 hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-[#7a765a] text-white"
                      : "mr-auto bg-white text-neutral-800 shadow-sm ring-1 ring-black/5"
                  }`}
                >
                  {m.content.split("\n").map((line, li, arr) => (
                    <span key={li}>
                      {line}
                      {li < arr.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </div>
              ))}

              {loadingProducts && showProductGrid && (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos…
                </div>
              )}

              {!loadingProducts && showProductGrid && products.length === 0 && (
                <p className="text-sm text-neutral-500">No hay productos activos en esta categoría por ahora.</p>
              )}

              {!loadingProducts && products.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {products.map((p) => {
                    const src = p.image_url?.trim();
                    return (
                      <div
                        key={p.id}
                        className="overflow-hidden rounded-2xl border border-[#e0dcd4] bg-white shadow-sm ring-1 ring-black/5"
                      >
                        <div className="relative aspect-[4/3] w-full bg-neutral-100">
                          {src ? (
                            <Image src={src} alt={p.name} fill className="object-cover" sizes="240px" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-neutral-400">Sin foto</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-neutral-900">{p.name}</p>
                          <p className="mt-1 text-sm font-semibold text-[#2d4a3e]">{formatArs(Number(p.price))}</p>
                          <button
                            type="button"
                            onClick={() => addToCart(p)}
                            disabled={streaming}
                            className="mt-2 w-full rounded-xl bg-[#7a765a] px-3 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-[#5f5c46] disabled:opacity-40"
                          >
                            Encargar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <div className="rounded-xl border border-[#d4cfc4] bg-[#fbfaf7] p-3 text-xs text-neutral-700">
                  <p className="font-black uppercase tracking-wide text-neutral-500">Tu encargo</p>
                  <ul className="mt-2 space-y-1">
                    {cart.map((c) => (
                      <li key={c.product_id}>
                        {c.quantity}× {c.name} — {formatArs(c.price * c.quantity)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-bold text-[#2d4a3e]">
                    Total: {formatArs(cart.reduce((s, c) => s + c.price * c.quantity, 0))}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-[#e0dcd4] bg-[#f7f5ef] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={openCheckout}
                  disabled={streaming || loadingProducts}
                  className="w-full rounded-xl bg-[#2d4a3e] px-3 py-2.5 text-sm font-black uppercase text-white hover:bg-[#1f342c] disabled:opacity-40"
                >
                  Confirmar encargo
                </button>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendUserMessage()}
                  placeholder="Escribí listo para confirmar…"
                  disabled={streaming || loadingProducts}
                  className="min-w-0 flex-1 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#7a765a] focus:outline-none focus:ring-2 focus:ring-[#c4b896]/50"
                />
                <button
                  type="button"
                  onClick={() => void sendUserMessage()}
                  disabled={streaming || loadingProducts || !input.trim()}
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
