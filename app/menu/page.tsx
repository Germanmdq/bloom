"use client";

import { useState, useEffect, Suspense, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronLeft, Plus, Minus, CreditCard, X } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { PublicAccountNav } from "@/components/PublicAccountNav";
import { SiteHeader } from "@/components/SiteHeader";
import { BloomChat, type BloomChatHandle } from "@/components/Menu/BloomChat";
import { WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";
import type { BloomChatCartLine } from "@/lib/bloom-chat-types";

const PEDIDOS_YA_BLOOM_URL =
    "https://www.pedidosya.com.ar/restaurantes/mar-del-plata/bloom-mar-del-plata-5c1357e3-e095-476e-9eee-eeda4620b75e-menu";

/** Marca Bloom — naranja / acento cálido / crema */
/** Paleta Bloom — oliva (logo) + crema + verde inglés (local) */
const fk = {
    primary: "#7a765a",
    primaryHover: "#5f5c46",
    accent: "#c4b896",
    /** Verde inglés — color del salón (fachada / acentos) */
    english: "#2d4a3e",
    englishDeep: "#1a3028",
    cream: "#f2f0e6",
    page: "#f7f5ef",
    dark: "#2c2a24",
} as const;

/** Menos datos por fila que select('*') — acelera la carga del menú. */
const MENU_PRODUCT_SELECT =
    "id, name, description, price, image_url, category_id, active, options, kind";

// --- HELPERS ---
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

function categoryLabel(c: { name: string }) {
    return c.name.replace(/^\p{Extended_Pictographic}\s*/u, "").trim() || c.name;
}

/** Primera imagen de producto activo por categoría (nombre ascendente), para fallback de tarjeta. */
function buildFirstProductImageByCategory(
    products: Array<{ category_id?: string | null; image_url?: string | null; name: string }>
) {
    const map = new Map<string, string>();
    const sorted = [...products]
        .filter((p) => p.category_id && p.image_url?.trim())
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const p of sorted) {
        const cid = String(p.category_id);
        if (!map.has(cid)) map.set(cid, p.image_url!.trim());
    }
    return map;
}

function categoryCardImageUrl(
    c: { id: string; image_url?: string | null },
    firstByCat: Map<string, string>
): string | null {
    const direct = c.image_url?.trim();
    if (direct) return direct;
    return firstByCat.get(c.id) ?? null;
}

// --- MAIN COMPONENT ---
function PublicMenuPage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const tableParam = searchParams.get("table");
    const tableId = tableParam ? parseInt(tableParam) : null;
    const zona = searchParams.get("zona"); // "barra" | "mesa" | null
    const num = searchParams.get("num");   // display number
    const isBarTable = zona === "barra";
    const tableLabel = tableId !== null
        ? isBarTable ? `Barra ${num ?? tableId}` : `Mesa ${num ?? tableId}`
        : null;
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    /** Número WhatsApp del local (app_settings); usado por checkout WA y Bloom chat */
    const [whatsappNumber, setWhatsappNumber] = useState("5491112345678");
    const [loading, setLoading] = useState(true);


    const bloomChatRef = useRef<BloomChatHandle>(null);

    // Cart & Checkout State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [orderSent, setOrderSent] = useState(false);

    // Checkout form state — 'items' | 'form'
    const [cartStep, setCartStep] = useState<'items' | 'form'>('items');
    const showCheckoutForm = cartStep === 'form';
    const [checkoutInfo, setCheckoutInfo] = useState({
        name: "",
        phone: "",
        address: "",
        type: "delivery" as "delivery" | "retiro",
    });
    const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // FETCH DATA — deps fijas [] (evita warning “dependency array changed size” con HMR/hidratación)
    useEffect(() => {
        const fetchMenu = async () => {
            const [{ data: cats }, { data: prods }, { data: settings }] = await Promise.all([
                supabase.from("categories").select("id, name, sort_order, icon, image_url").order("sort_order", { ascending: true }),
                supabase.from("products").select(MENU_PRODUCT_SELECT).eq("active", true),
                supabase.from("app_settings").select("whatsapp, plato_del_dia_id").eq("id", 1).single(),
            ]);
            if (cats) {
                const seen = new Set();
                const unique = cats.filter((c: any) => {
                    const key = c.name.toLowerCase().trim();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setCategories(unique);
            }
            if (prods) setProducts(prods);
            if (settings?.whatsapp) setWhatsappNumber(settings.whatsapp);
            if (settings?.plato_del_dia_id && prods) {
                const featured = prods.find((p: any) => p.id === settings.plato_del_dia_id);
                if (featured) {
                    prods.forEach((p: any) => { p.kind = p.id === settings.plato_del_dia_id ? 'plato_del_dia' : (p.kind === 'plato_del_dia' ? 'menu' : p.kind); });
                }
            }
            setLoading(false);
        };
        fetchMenu();
    }, []);

    const platoDiaProduct = products.find(p => p.kind === 'plato_del_dia');

    const firstProductImageByCategory = useMemo(
        () => buildFirstProductImageByCategory(products),
        [products]
    );

    const openChatWithCategory = useCallback((categoryId: string, displayName: string) => {
        bloomChatRef.current?.openWithCategoryMessage({ categoryId, displayName });
    }, []);

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }).filter(item => item.quantity > 0));
    };

    // CHECKOUT HANDLERS
    const validateCheckoutForm = () => {
        const errors: Record<string, string> = {};
        if (!checkoutInfo.name.trim()) errors.name = 'Ingresá tu nombre';
        if (!checkoutInfo.phone.trim()) errors.phone = 'Ingresá tu teléfono';
        if (checkoutInfo.type === "delivery" && !checkoutInfo.address.trim()) errors.address = "Ingresá la dirección de entrega";
        setCheckoutErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Función central para guardar un pedido web
    const saveWebOrder = async (itemsToOrder: any[], ci: typeof checkoutInfo) => {
        const total = itemsToOrder.reduce((acc, i) => acc + i.price * (i.quantity ?? 1), 0);
        const items = itemsToOrder.map(i => ({
            name: i.name, quantity: i.quantity ?? 1, price: i.price,
            variants: i.variants || [], observations: i.observations || '',
        }));

        const deliveryInfo = ci.type === "delivery" ? `Delivery a: ${ci.address}` : "Retiro en local";

        const { data: { session } } = await supabase.auth.getSession();
        const row: Record<string, unknown> = {
            table_id: ci.type === "delivery" ? WEB_ORDER_TABLE_DELIVERY : WEB_ORDER_TABLE_RETIRO,
            customer_name: ci.name, customer_phone: ci.phone,
            delivery_type: ci.type, delivery_info: deliveryInfo,
            items, total, status: 'PENDING', order_type: 'WEB',
            paid: false,
        };
        if (session?.user?.id) {
            row.customer_id = session.user.id;
        }

        const { error } = await supabase.from('orders').insert(row);
        if (error) console.error('Error guardando pedido:', error.message, error.details);

        // Upsertear salon_tables para que el pedido aparezca en el dashboard
        const virtualTableId = ci.type === "delivery" ? WEB_ORDER_TABLE_DELIVERY : WEB_ORDER_TABLE_RETIRO;
        await supabase.from('salon_tables').upsert(
            { id: virtualTableId, status: 'OCCUPIED', updated_at: new Date().toISOString() },
            { onConflict: 'id' }
        );
        // Guardamos el checkoutInfo para mostrarlo en la confirmación
        setCheckoutInfo(ci);
        setOrderSent(true);
        setIsCartOpen(false);
        setCart([]);
        setCartStep('items');
    };

    const handleMercadoPagoCheckout = async () => {
        if (!tableId && !showCheckoutForm) { setCartStep('form'); return; }
        if (!tableId && !validateCheckoutForm()) return;
        setIsPaying(true);
        try {
            await saveWebOrder(cart, checkoutInfo);
        } catch (error) {
            console.error(error);
            toast.error("Error al confirmar el pedido, intentá de nuevo");
        } finally {
            setIsPaying(false);
        }
    };

    /** Abre WhatsApp con el pedido. Si pasás `lines`, usa ese carrito (p. ej. asistente Bloom); si no, el estado `cart`. */
    const handleWhatsAppCheckout = useCallback(
        (overrideCart?: BloomChatCartLine[]) => {
            const c = overrideCart ?? cart;
            if (c.length === 0) return;
            const itemsList = c.map((i) => {
                const vars = i.variants?.length ? ` [${i.variants.map((v: { name: string }) => v.name).join(", ")}]` : "";
                const obs = i.observations ? ` _(${i.observations})_` : "";
                return `• ${i.quantity}x ${i.name}${vars}${obs} (${formatCurrency(i.price * i.quantity)})`;
            }).join("%0A");

            const cartTotal = c.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const mesaInfo = tableLabel ? `📍 *${tableLabel}*%0A%0A` : "";
            const text = `Hola Bloom! 👋 Quiero pedir:%0A%0A${mesaInfo}${itemsList}%0A%0A*Total: ${formatCurrency(cartTotal)}*`;
            window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
        },
        [cart, tableLabel, whatsappNumber]
    );

    useEffect(() => {
        const w = window as Window & {
            __bloomMenuCheckout?: {
                whatsappNumber: string;
                handleWhatsAppCheckout: () => void;
                handleWhatsAppCheckoutWithCart: (lines: BloomChatCartLine[]) => void;
            };
        };
        w.__bloomMenuCheckout = {
            whatsappNumber,
            handleWhatsAppCheckout: () => handleWhatsAppCheckout(),
            handleWhatsAppCheckoutWithCart: (lines: BloomChatCartLine[]) => handleWhatsAppCheckout(lines),
        };
        return () => {
            delete w.__bloomMenuCheckout;
        };
    }, [whatsappNumber, handleWhatsAppCheckout]);

    // TABLE SELF-ORDER: send directly to kitchen and update table items
    const handleTableCheckout = async () => {
        if (cart.length === 0 || !tableId) return;
        setIsPaying(true);
        try {
            const items = cart.map(i => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                variants: i.variants || [],
                observations: i.observations || '',
            }));
            const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

            // Use server-side API route — more reliable than direct Supabase client
            const res = await fetch('/api/table-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableId, items, total }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                toast.error(data.error || 'Error al enviar el pedido');
                setIsPaying(false);
                return;
            }

            setOrderSent(true);
            setIsCartOpen(false);
            setCart([]);
        } catch (error) {
            console.error('[handleTableCheckout]', error);
            toast.error('Error de red. Verificá tu conexión e intentá de nuevo.');
        } finally {
            setIsPaying(false);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.page }}>
                <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: `${fk.accent}`, borderTopColor: fk.primary }} />
                <p className="font-black text-sm uppercase tracking-[0.2em]" style={{ color: fk.primary }}>
                    Cargando menú…
                </p>
            </div>
        );
    }

    if (orderSent) return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: fk.page }}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border-2 border-bloom-200 space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-4xl">✅</span>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">¡Pedido confirmado!</h1>
                    {checkoutInfo.name && (
                        <p className="text-gray-500 mt-1">Gracias, <strong>{checkoutInfo.name}</strong></p>
                    )}
                </div>

                {tableLabel ? (
                    <div className="bg-gray-50 rounded-2xl py-3 px-5">
                        <p className="text-sm text-gray-400">Mesa</p>
                        <p className="text-xl font-black text-gray-900">{tableLabel}</p>
                        <p className="text-sm text-gray-400 mt-1">En breve el mozo se acerca.</p>
                    </div>
                ) : checkoutInfo.type === "delivery" ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl py-3 px-5 text-left">
                        <p className="text-xs font-black text-blue-500 uppercase tracking-wide mb-1">🛵 Delivery</p>
                        <p className="text-sm font-bold text-gray-800">{checkoutInfo.address}</p>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-2xl py-3 px-5">
                        <p className="text-sm font-bold text-gray-700">🏃 Retiro en local</p>
                        <p className="text-xs text-gray-400 mt-0.5">Te avisamos cuando esté listo</p>
                    </div>
                )}

                <p className="text-xs text-gray-400 pt-2">
                    Nos ponemos en contacto a la brevedad.
                </p>
                <button
                    onClick={() => {
                        setOrderSent(false);
                        setCheckoutInfo({ name: "", phone: "", address: "", type: "delivery" });
                    }}
                    className="w-full py-3.5 text-white font-black rounded-2xl transition-colors text-sm shadow-lg hover:opacity-95"
                    style={{ backgroundColor: fk.primary }}
                >
                    Hacer otro pedido
                </button>
            </div>
        </div>
    );

    // --- RENDER ---
    return (
        <main className="min-h-screen text-neutral-900 font-sans pb-32 selection:bg-bloom-200/60 selection:text-neutral-900" style={{ backgroundColor: fk.page }}>

            <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            <SiteHeader
                scrolled={false}
                onMobileNavOpen={() => setMobileNavOpen(true)}
                activeNav="menu"
                accentColor={fk.primary}
                showCartButton
                cartCount={cartCount}
                onCartOpen={() => setIsCartOpen(true)}
                menuExtras={
                    <>
                        <Link
                            href="#menu-categories"
                            className="xl:hidden inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-white shadow-md active:scale-[0.98] whitespace-nowrap"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <ShoppingBag size={15} className="shrink-0" strokeWidth={2.5} />
                            Categorías
                        </Link>
                        {tableLabel ? (
                            <span
                                className="text-white text-xs sm:text-sm font-black px-3 py-1.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: fk.dark }}
                            >
                                {tableLabel}
                            </span>
                        ) : null}
                        <PublicAccountNav />
                    </>
                }
            />

            <div id="menu-categories" className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 xl:px-8 scroll-mt-28">
                <div className="mb-8">
                    <p className="font-bold uppercase tracking-[0.15em] text-xs mb-1" style={{ color: fk.primary }}>
                        Bloom
                    </p>
                    <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight">Elegí una categoría</h1>
                    <p className="text-neutral-600 text-sm mt-2 max-w-xl">
                        Tocá una tarjeta para ver productos y armar tu encargo.
                    </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-3">
                    {platoDiaProduct && (
                        <button
                            type="button"
                            disabled={!platoDiaProduct}
                            onClick={() =>
                                platoDiaProduct &&
                                bloomChatRef.current?.openWithCategoryMessage({
                                    displayName: "Plato del Día",
                                    productIds: [platoDiaProduct.id],
                                })
                            }
                            className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl text-left shadow-md transition active:scale-[0.98] enabled:hover:opacity-[0.98] disabled:opacity-50 md:aspect-video"
                            aria-label="Plato del Día — armar encargo"
                        >
                            {platoDiaProduct.image_url?.trim() ? (
                                <Image
                                    src={platoDiaProduct.image_url.trim()}
                                    alt=""
                                    fill
                                    className="object-cover transition duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 360px"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-amber-800 to-amber-950"
                                    aria-hidden
                                />
                            )}
                            <div
                                className="absolute inset-0 bg-gradient-to-t from-amber-950/90 via-amber-600/40 to-amber-300/30"
                                aria-hidden
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-3 pt-10">
                                <span className="text-base font-bold leading-tight text-white drop-shadow-md md:text-lg">
                                    Plato del Día
                                </span>
                            </div>
                        </button>
                    )}
                    {categories.map((c: { id: string; name: string; icon?: string | null; image_url?: string | null }) => {
                        const label = categoryLabel(c);
                        const cardUrl = categoryCardImageUrl(c, firstProductImageByCategory);
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => openChatWithCategory(c.id, label)}
                                className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl text-left shadow-md transition active:scale-[0.98] md:aspect-video"
                                aria-label={`${label} — armar encargo`}
                            >
                                {cardUrl ? (
                                    <Image
                                        src={cardUrl}
                                        alt=""
                                        fill
                                        className="object-cover transition duration-300 group-hover:scale-105"
                                        sizes="(max-width: 768px) 50vw, 360px"
                                    />
                                ) : (
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900"
                                        aria-hidden
                                    />
                                )}
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10"
                                    aria-hidden
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-3 pt-10">
                                    <span className="text-base font-bold leading-tight text-white drop-shadow-md md:text-lg">
                                        {label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CART & CHECKOUT UI */}
            <AnimatePresence>
                {/* Floating Bottom Bar (Mobile) */}
                {cartCount > 0 && !isCartOpen && (
                    <motion.div key="mobile-cart-bar" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between font-black border-2 border-white/20"
                            style={{ backgroundColor: fk.dark }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-sm">{cartCount}</span>
                                <span>Ver Pedido</span>
                            </div>
                            <span>{formatCurrency(cartTotal)}</span>
                        </button>
                    </motion.div>
                )}

                {/* Desktop Floating Button */}
                {cartCount > 0 && !isCartOpen && (
                    <motion.div key="desktop-cart-btn" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="hidden md:block fixed bottom-8 right-8 z-50">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform relative border-2 border-white/30"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <ShoppingBag size={24} />
                            <span
                                className="absolute -top-1 -right-1 text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white"
                                style={{ backgroundColor: fk.accent, color: fk.dark }}
                            >
                                {cartCount}
                            </span>
                        </button>
                    </motion.div>
                )}

                {/* Cart Modal / Drawer */}
                {isCartOpen && (
                    <>
                        <motion.div key="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsCartOpen(false); setCartStep('items'); }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
                        <motion.div
                            key="cart-drawer"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-bloom-page z-[60] shadow-2xl flex flex-col font-sans border-l border-bloom-200"
                        >
                            <div className="shrink-0 z-10 flex items-center justify-between border-b border-bloom-200 bg-white p-5 shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: fk.primary }}>
                                        Carrito
                                    </p>
                                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Tu pedido</h2>
                                    {tableLabel && (
                                        <p className="text-sm font-bold text-gray-500 mt-0.5">{tableLabel}</p>
                                    )}
                                </div>
                                {showCheckoutForm && (
                                    <button
                                        onClick={() => setCartStep('items')}
                                        className="flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Volver
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Delivery / retiro — pedidos web; PedidosYa va en el pie fijo del carrito */}
                                {!tableId && (
                                    <div className="space-y-3 rounded-2xl border border-bloom-200 bg-white/80 p-4 shadow-sm">
                                        <p className="font-black text-gray-900 text-base">¿Cómo recibís el pedido?</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([
                                                { id: "delivery" as const, label: "🛵 Delivery" },
                                                { id: "retiro" as const, label: "🏃 Retiro en local" },
                                            ]).map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setCheckoutInfo((p) => ({ ...p, type: t.id }))}
                                                    className={`py-2.5 rounded-xl font-bold text-xs transition-all ${checkoutInfo.type === t.id ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                                                    style={checkoutInfo.type === t.id ? { backgroundColor: fk.primary } : undefined}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vista carrito ítems */}
                                {!showCheckoutForm && (
                                    <>
                                        {cart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-16">
                                                <ShoppingBag size={64} className="mb-4" />
                                                <p className="font-medium text-lg">Tu carrito está vacío</p>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <div key={item.cartItemId} className="flex gap-4 group">
                                                    <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 relative">
                                                        {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-gray-900 text-lg leading-none">{item.name}</h4>
                                                            <span className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                                                        </div>
                                                        {item.variants && item.variants.length > 0 && (
                                                            <p className="text-gray-500 text-xs leading-relaxed">
                                                                {item.variants.map((v: any) => v.name).join(', ')}
                                                            </p>
                                                        )}
                                                        {item.observations && (
                                                            <p className="text-bloom-600 text-xs italic mt-0.5 leading-relaxed">
                                                                📝 {item.observations}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                                <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-white rounded-md transition-colors shadow-sm"><Minus size={14} /></button>
                                                                <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-white rounded-md transition-colors shadow-sm"><Plus size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {/* Datos de contacto (paso confirmar) */}
                                {!tableId && showCheckoutForm && (
                                    <div className="space-y-3">
                                        <p className="font-black text-gray-900 text-base">Tus datos</p>

                                        {/* Nombre + Teléfono siempre visibles */}
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Nombre completo *"
                                                value={checkoutInfo.name}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, name: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                            />
                                            {checkoutErrors.name && <p className="text-red-500 text-xs mt-1">{checkoutErrors.name}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="tel"
                                                placeholder="Teléfono / WhatsApp *"
                                                value={checkoutInfo.phone}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, phone: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                            />
                                            {checkoutErrors.phone && <p className="text-red-500 text-xs mt-1">{checkoutErrors.phone}</p>}
                                        </div>

                                        {/* Dirección (solo delivery) */}
                                        {checkoutInfo.type === 'delivery' && (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Dirección de entrega *"
                                                    value={checkoutInfo.address}
                                                    onChange={e => setCheckoutInfo(p => ({ ...p, address: e.target.value }))}
                                                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                                />
                                                {checkoutErrors.address && <p className="text-red-500 text-xs mt-1">{checkoutErrors.address}</p>}
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>

                            {/* Footer fijo — PedidosYa + total + botones */}
                            <div className="shrink-0 p-5 bg-white border-t border-gray-100 space-y-3">
                                {!tableId && (
                                    <a
                                        href={PEDIDOS_YA_BLOOM_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 px-3 text-center text-xs font-black leading-snug text-white shadow-md transition-opacity hover:opacity-95 sm:text-sm"
                                        style={{ backgroundColor: fk.primary }}
                                    >
                                        A más de 250 m — pedí en PedidosYa
                                    </a>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                                </div>

                                <div className="space-y-3">
                                    {/* Prompt login */}
                                    {!tableId && (
                                        <Link
                                            href="/auth"
                                            onClick={() => setIsCartOpen(false)}
                                            className="block w-full text-center text-sm font-bold text-neutral-600 underline-offset-4 hover:underline hover:text-neutral-900 py-2"
                                        >
                                            Iniciar sesión
                                        </Link>
                                    )}

                                    {tableId ? (
                                        /* Mesa: botón directo */
                                        <button
                                            onClick={handleTableCheckout}
                                            disabled={!cart.length || isPaying}
                                            className="w-full text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                            style={{ backgroundColor: fk.primary }}
                                        >
                                            {isPaying ? 'Enviando...' : '✓ Cerrar Pedido'}
                                        </button>
                                    ) : showCheckoutForm ? (
                                        /* Ya en el form: botón confirmar */
                                        <button
                                            onClick={handleMercadoPagoCheckout}
                                            disabled={!cart.length || isPaying}
                                            className="w-full text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                            style={{ backgroundColor: fk.primary }}
                                        >
                                            {isPaying ? 'Procesando...' : <><CreditCard size={20} /> Confirmar y Pagar</>}
                                        </button>
                                    ) : (
                                        /* Estado inicial: dos botones */
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setCartStep('form')}
                                                disabled={!cart.length}
                                                className="w-full text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg hover:opacity-95"
                                                style={{ backgroundColor: fk.primary }}
                                            >
                                                <CreditCard size={20} /> Pedir o Pagar
                                            </button>
                                            <button
                                                onClick={() => { setIsCartOpen(false); setCartStep('items'); }}
                                                className="w-full py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-base"
                                            >
                                                + Seguir pidiendo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <BloomChat ref={bloomChatRef} />
            <SiteFooter />
        </main>
    );
}

export default function MenuPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.page }}>
                    <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: fk.accent, borderTopColor: fk.primary }} />
                    <p className="font-black text-sm uppercase tracking-[0.2em]" style={{ color: fk.primary }}>
                        Menú
                    </p>
                </div>
            }
        >
            <PublicMenuPage />
        </Suspense>
    );
}
