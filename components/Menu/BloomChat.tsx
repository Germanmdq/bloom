"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
};

type CartLine = {
  lineId: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  observations: string;
};

export type OpenCategoryOpts = {
  displayName: string;
  categoryId?: string | null;
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

type ChatContext = {
  displayName: string;
  categoryId: string | null;
  productIds: string[] | null;
};

function ProductCard({
  product,
  added,
  onEncargar,
}: {
  product: ProductRow;
  added: boolean;
  onEncargar: (observations: string) => void;
}) {
  const [observation, setObservation] = useState("");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e0dcd4] bg-white p-3 shadow-sm ring-1 ring-black/5">
      {added && (
        <div
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md"
          aria-label="Agregado"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
      )}
      <div className="pr-10">
        <p className="font-bold text-neutral-900">{product.name}</p>
        <p className="mt-1 text-sm font-semibold text-[#2d4a3e]">{formatArs(Number(product.price))}</p>
        <label className="mt-2 block text-xs font-bold text-neutral-500">Observaciones (opcional)</label>
        <input
          type="text"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          disabled={added}
          placeholder="Ej. sin sal, bien cocido…"
          className="mt-1 w-full rounded-lg border border-[#d4cfc4] bg-white px-2 py-1.5 text-sm disabled:bg-neutral-100"
        />
        <button
          type="button"
          disabled={added}
          onClick={() => onEncargar(observation.trim())}
          className={`mt-2 w-full rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition ${
            added ? "bg-emerald-600" : "bg-[#7a765a] hover:bg-[#5f5c46]"
          } disabled:cursor-default`}
        >
          {added ? "Agregado ✓" : "Encargar"}
        </button>
      </div>
    </div>
  );
}

export const BloomChat = forwardRef<BloomChatHandle>(function BloomChat(_props, ref) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [contextKey, setContextKey] = useState(0);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [introText, setIntroText] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(() => new Set());

  const [encargoOpen, setEncargoOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"local" | "delivery">("local");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHistoryLink, setShowHistoryLink] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [cart, products, open, encargoOpen, successMessage]);

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
          .select("id,name,description,price,category_id")
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

  const resetForContext = useCallback(() => {
    setCart([]);
    setAddedProductIds(new Set());
    setEncargoOpen(false);
    setSuccessMessage(null);
    setShowHistoryLink(false);
    setCheckoutName("");
    setCheckoutPhone("");
    setCheckoutAddress("");
    setDeliveryType("local");
  }, []);

  const addLine = useCallback((p: ProductRow, observations: string) => {
    const lineId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random()}`;
    setCart((prev) => [
      ...prev,
      {
        lineId,
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: 1,
        observations,
      },
    ]);
    setAddedProductIds((prev) => new Set(prev).add(p.id));
  }, []);

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
    if (deliveryType === "delivery" && !address) {
      toast.error("Ingresá la dirección de entrega");
      return;
    }

    setSubmittingOrder(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const loggedIn = !!session?.access_token;

      const res = await fetch("/api/bloom-chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            product_id: c.product_id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            ...(c.observations ? { observations: c.observations } : {}),
          })),
          customer_name: name,
          customer_phone: phone,
          delivery_type: deliveryType,
          ...(deliveryType === "delivery" ? { delivery_address: address } : {}),
          ...(session?.access_token ? { access_token: session.access_token } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Error al enviar el encargo");
        return;
      }

      setEncargoOpen(false);
      setSuccessMessage("Encargo enviado, te esperamos en Bloom!");
      setShowHistoryLink(!loggedIn);
      setCart([]);
      setAddedProductIds(new Set());
      setCheckoutName("");
      setCheckoutPhone("");
      setCheckoutAddress("");
      setDeliveryType("local");
      setContextKey((k) => k + 1);
      toast.success("Listo");
    } catch (e) {
      console.error(e);
      toast.error("Error de red");
    } finally {
      setSubmittingOrder(false);
    }
  }, [cart, checkoutName, checkoutPhone, checkoutAddress, deliveryType, supabase]);

  const openFabChat = useCallback(() => {
    resetForContext();
    setContext({ displayName: "Bloom", categoryId: null, productIds: null });
    setIntroText(genericIntro());
    setProducts([]);
    setContextKey((k) => k + 1);
    setOpen(true);
  }, [resetForContext]);

  useImperativeHandle(
    ref,
    () => ({
      openWithCategoryMessage: (opts: OpenCategoryOpts) => {
        resetForContext();
        const productIds = opts.productIds?.length ? opts.productIds : null;
        setContext({
          displayName: opts.displayName,
          categoryId: opts.categoryId ?? null,
          productIds,
        });
        setIntroText(categoryIntro(opts.displayName));
        setContextKey((k) => k + 1);
        setOpen(true);
      },
      openChat: openFabChat,
    }),
    [openFabChat, resetForContext]
  );

  const closeModal = () => {
    setOpen(false);
    setContext(null);
    setEncargoOpen(false);
    setSuccessMessage(null);
    setShowHistoryLink(false);
  };

  const showProductGrid =
    context &&
    ((context.productIds?.length ?? 0) > 0 || !!context.categoryId) &&
    (loadingProducts || products.length > 0);

  const productListKey = `${contextKey}-${context?.categoryId ?? ""}-${context?.productIds?.join(",") ?? ""}`;

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

      {encargoOpen && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#e8e4dc] bg-[#f7f5ef] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bloom-encargo-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#e0dcd4] px-4 py-3">
              <h2 id="bloom-encargo-title" className="font-black text-neutral-900">
                Tu encargo
              </h2>
              <button
                type="button"
                onClick={() => setEncargoOpen(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-black/5"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-3 text-sm">
                {cart.map((line) => (
                  <li key={line.lineId} className="rounded-xl border border-[#d4cfc4] bg-white p-3">
                    <p className="font-bold text-neutral-900">
                      {line.quantity}× {line.name}
                    </p>
                    {line.observations ? (
                      <p className="mt-1 text-xs text-neutral-600">Obs.: {line.observations}</p>
                    ) : null}
                    <p className="mt-1 font-semibold text-[#2d4a3e]">{formatArs(line.price * line.quantity)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[#e0dcd4] pt-3 text-base font-black text-[#2d4a3e]">
                Total: {formatArs(cartTotal)}
              </p>

              <div className="mt-6 space-y-3 border-t border-[#e0dcd4] pt-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Datos para tu encargo</p>
                <div>
                  <label className="text-xs font-bold text-neutral-500">Nombre</label>
                  <input
                    value={checkoutName}
                    onChange={(e) => setCheckoutName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500">Teléfono</label>
                  <input
                    value={checkoutPhone}
                    onChange={(e) => setCheckoutPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d4cfc4] bg-white px-3 py-2 text-sm"
                    autoComplete="tel"
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold text-neutral-500">Entrega</legend>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === "local"}
                      onChange={() => setDeliveryType("local")}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">Retiro en local</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc4] bg-white px-3 py-2">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === "delivery"}
                      onChange={() => setDeliveryType("delivery")}
                      className="accent-[#2d4a3e]"
                    />
                    <span className="text-sm font-medium">Delivery</span>
                  </label>
                </fieldset>
                {deliveryType === "delivery" && (
                  <div>
                    <label className="text-xs font-bold text-neutral-500">Dirección</label>
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
            </div>

            <div className="shrink-0 border-t border-[#e0dcd4] bg-[#f7f5ef] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={submittingOrder}
                onClick={() => void submitOrder()}
                className="w-full rounded-xl bg-[#7a765a] px-4 py-3 text-sm font-black uppercase text-white hover:bg-[#5f5c46] disabled:opacity-50"
              >
                {submittingOrder ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Confirmar encargo"}
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

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24">
              <div className="max-w-[92%] rounded-2xl bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 shadow-sm ring-1 ring-black/5">
                {introText.split("\n").map((line, li, arr) => (
                  <span key={li}>
                    {line}
                    {li < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </div>

              {successMessage && (
                <div className="space-y-2">
                  <div className="max-w-[92%] rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
                    {successMessage}
                  </div>
                  {showHistoryLink && (
                    <Link
                      href="/auth"
                      className="inline-block text-xs font-semibold text-[#2d4a3e] underline underline-offset-2 hover:text-[#1a3028]"
                    >
                      Creá tu cuenta para ver el historial de tus encargos
                    </Link>
                  )}
                </div>
              )}

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
                  {products.map((p) => (
                    <ProductCard
                      key={`${productListKey}-${p.id}`}
                      product={p}
                      added={addedProductIds.has(p.id)}
                      onEncargar={(obs) => addLine(p, obs)}
                    />
                  ))}
                </div>
              )}
            </div>

            {cartCount > 0 && (
              <div className="sticky bottom-0 z-10 border-t border-[#e0dcd4] bg-[#f7f5ef]/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setEncargoOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl bg-[#2d4a3e] px-4 py-3 text-left text-sm font-bold text-white shadow-lg transition hover:bg-[#1f342c]"
                >
                  <span>
                    {cartCount} {cartCount === 1 ? "producto" : "productos"} — Ver encargo →
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
