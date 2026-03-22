"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronLeft, ChevronDown, Plus, Minus, Search, CreditCard, User, MapPin, Phone, Truck, SlidersHorizontal } from "lucide-react";
import { CustomerAuthModal } from "@/components/Menu/CustomerAuthModal";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";
import { VariantSelector } from "@/components/pos/VariantSelector"; // Reusing logic
import { FoodKingMobileNavButton, FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";

/** Marca Bloom — naranja / acento cálido / crema */
const fk = {
    primary: "#ea580c",
    primaryHover: "#c2410c",
    yellow: "#ffc107",
    cream: "#fffdf8",
    dark: "#1a1a1a",
} as const;

/** Ver todos los productos — vista shop por defecto */
const ALL_CATEGORIES = { id: "all", name: "Todos los productos", virtual: true, isAll: true };

// --- HELPERS ---
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

// --- MAIN COMPONENT ---
function PublicMenuPage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const tableParam = searchParams.get("table");
    const tableId = tableParam ? parseInt(tableParam) : null;
    const zona = searchParams.get("zona"); // "barra" | "mesa" | null
    const num = searchParams.get("num");   // display number
    const catParam = searchParams.get("cat"); // pre-select category from home
    const isBarTable = zona === "barra";
    const tableLabel = tableId !== null
        ? isBarTable ? `Barra ${num ?? tableId}` : `Mesa ${num ?? tableId}`
        : null;
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [whatsappNumber, setWhatsappNumber] = useState("5491112345678");
    const [loading, setLoading] = useState(true);

    // Virtual categories
    const PLATO_DIA_CAT = { id: 'virtual-plato-dia', name: 'Plato del Día', virtual: true, isPlato: true };
    const PLATOS_DIARIOS_CAT = { id: 'virtual-platos-diarios', name: 'Platos Diarios', virtual: true, isPlatos: true };

    // Navigation — por defecto "Todos" (vista shop con sidebar)
    const [selectedCategory, setSelectedCategory] = useState<any>(ALL_CATEGORIES);
    const [searchQuery, setSearchQuery] = useState("");
    /** Filtro precio ARS (vacío = sin límite) — como FoodKing shop */
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");

    // Cart & Checkout State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [orderSent, setOrderSent] = useState(false);

    // Checkout form state — 'items' | 'form'
    const [cartStep, setCartStep] = useState<'items' | 'form'>('items');
    const showCheckoutForm = cartStep === 'form';
    const [checkoutInfo, setCheckoutInfo] = useState({
        name: '', phone: '', address: '',
        type: 'delivery' as 'delivery' | 'retiro' | 'tribunales',
        tEdificio: '',
        tPiso: '',
        tOficina: '',
        tReceptor: '',
        tMesaEntradas: false,
    });
    const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

    const TRIBUNALES_EDIFICIOS = [
        { id: 'central',  label: 'Edificio Central',       sub: 'Alte. Brown 2005' },
        { id: 'civiles',  label: 'Anexo Civiles',          sub: 'Alte. Brown 2241 / 2257' },
        { id: 'abogados', label: 'Colegio de Abogados',    sub: 'Alte. Brown 1958' },
        { id: 'federal',  label: 'Justicia Federal',       sub: 'Alte. Brown 1762' },
    ];
    const TRIBUNALES_PISOS_CENTRAL = [
        'Subsuelo — Administración / Arquitectura',
        'Planta Baja — Informes / Seguridad / Mesa de Entradas',
        'Piso 1 — Juzgados de Garantías (1, 2 o 3)',
        'Piso 2 — Juzgados de Garantías (4, 5 o 6)',
        'Piso 3 — Juzgados Correccionales (2, 3, 4 o 5)',
        'Piso 4 — Juzgado de Ejecución Penal N° 2',
        'Piso 7 — Juzgado de Ejecución Penal N° 1 / Correccional N° 1',
    ];

    // Variant Selection State
    const [variantProduct, setVariantProduct] = useState<any>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    /** Móvil: categorías + precio en un solo desplegable */
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Helpers for Variant Logic (Duplicated from POS/page for simplicity here)
    const HAS_VARIANTS = (p: any) => {
        const name = p.name.toLowerCase();
        return name.includes('milanesa') || name.includes('hamburguesa') || name.includes('pizza') || name.includes('lomo') || name.includes('empanada') || name.includes('pasta') || name.includes('sorrentinos') || name.includes('ravioles') || name.includes('noquis') || name.includes('ñoquis') || name.includes('pechuga') || name.includes('patamuslo') || name.includes('filet') || name.includes('bife') || name.includes('guarnición') || name.includes('guarnicion');
    };

    // FETCH DATA — deps fijas [] (evita warning “dependency array changed size” con HMR/hidratación)
    useEffect(() => {
        const fetchMenu = async () => {
            const [{ data: cats }, { data: prods }, { data: settings }] = await Promise.all([
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('products').select('*').eq('active', true),
                supabase.from('app_settings').select('whatsapp, plato_del_dia_id').eq('id', 1).single(),
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

    // Sincronizar categoría con ?cat= — mismo tamaño de deps en cada render
    useEffect(() => {
        if (categories.length === 0) return;
        if (!catParam) {
            setSelectedCategory(ALL_CATEGORIES);
            return;
        }
        const q = catParam.toLowerCase();
        if (q.includes("plato del d")) {
            setSelectedCategory({ id: "virtual-plato-dia", name: "Plato del Día", virtual: true, isPlato: true });
            return;
        }
        if (q.includes("plato") && q.includes("diario")) {
            setSelectedCategory({ id: "virtual-platos-diarios", name: "Platos Diarios", virtual: true, isPlatos: true });
            return;
        }
        const match = categories.find(
            (c: any) =>
                c.name.toLowerCase().includes(q) ||
                q.includes(c.name.toLowerCase().split(" ")[0])
        );
        if (match) setSelectedCategory(match);
    }, [catParam, categories]);

    // Platos Diarios category id (real)
    const platosDiariosCat = categories.find(c => c.name.toLowerCase().includes('plato') && c.name.toLowerCase().includes('diario'));
    const platoDiaProduct = products.find(p => p.kind === 'plato_del_dia');

    const priceBounds = useMemo(() => {
        if (!products.length) return { min: 0, max: 50000 };
        const prices = products.map((p) => Number(p.price) || 0);
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }, [products]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = products.filter((p) => {
            const price = Number(p.price) || 0;
            if (priceMin !== "" && !Number.isNaN(Number(priceMin)) && price < Number(priceMin)) return false;
            if (priceMax !== "" && !Number.isNaN(Number(priceMax)) && price > Number(priceMax)) return false;
            if (q && !p.name.toLowerCase().includes(q)) return false;

            if (selectedCategory?.isAll) return true;
            if (selectedCategory?.virtual && selectedCategory?.isPlato) return p.kind === "plato_del_dia";
            if (selectedCategory?.virtual && selectedCategory?.isPlatos) {
                return platosDiariosCat ? p.category_id === platosDiariosCat.id : false;
            }
            if (selectedCategory?.id && !selectedCategory?.virtual) return p.category_id === selectedCategory.id;
            return true;
        });

        if (sortBy === "price-asc") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
        else if (sortBy === "price-desc") list = [...list].sort((a, b) => Number(b.price) - Number(a.price));

        return list;
    }, [products, selectedCategory, searchQuery, priceMin, priceMax, platosDiariosCat, sortBy]);

    // CART OPERATIONS
    const addToCart = (product: any, variants: any[] = [], observations?: string) => {
        const variantKey = variants.map(v => v.name).sort().join('|');
        const obsKey = observations ? `-obs:${observations}` : '';
        const cartItemId = `${product.id}-${variantKey}${obsKey}`;
        const extrasPrice = variants.reduce((sum, v) => sum + (v.price || 0), 0);
        const unitPrice = product.price + extrasPrice;

        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, cartItemId, price: unitPrice, quantity: 1, variants, observations: observations || '' }];
        });

        toast.success(`Agregado: ${product.name}`);
        setVariantProduct(null);
    };

    const handleProductClick = (product: any) => {
        // Siempre abrir el popup para variantes u observaciones
        setVariantProduct(product);
    };

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
        if (checkoutInfo.type === 'delivery' && !checkoutInfo.address.trim()) errors.address = 'Ingresá la dirección de entrega';
        if (checkoutInfo.type === 'tribunales') {
            if (!checkoutInfo.tEdificio) errors.tEdificio = 'Seleccioná el edificio';
            if (!checkoutInfo.tReceptor.trim()) errors.tReceptor = 'Ingresá el nombre de quien recibe';
        }
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

        let deliveryInfo = '';
        if (ci.type === 'tribunales') {
            const edif = TRIBUNALES_EDIFICIOS.find(e => e.id === ci.tEdificio);
            deliveryInfo = [
                `Edificio: ${edif?.label ?? ci.tEdificio}`,
                ci.tPiso ? `Piso: ${ci.tPiso}` : '',
                ci.tOficina ? `Oficina: ${ci.tOficina}` : '',
                `Receptor: ${ci.tReceptor}`,
                ci.tMesaEntradas ? 'Dejar en Mesa de Entradas' : 'Llamar al llegar',
            ].filter(Boolean).join(' | ');
        } else if (ci.type === 'delivery') {
            deliveryInfo = `Delivery a: ${ci.address}`;
        } else {
            deliveryInfo = 'Retiro en local';
        }

        const { error } = await supabase.from('orders').insert({
            table_id: null,
            customer_name: ci.name, customer_phone: ci.phone,
            delivery_type: ci.type, delivery_info: deliveryInfo,
            items, total, status: 'PENDING', order_type: 'WEB',
        });
        if (error) console.error('Error guardando pedido:', error.message, error.details);
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

    const handleWhatsAppCheckout = () => {
        if (cart.length === 0) return;
        const itemsList = cart.map(i => {
            const vars = i.variants?.length ? ` [${i.variants.map((v: any) => v.name).join(', ')}]` : '';
            const obs = i.observations ? ` _(${i.observations})_` : '';
            return `• ${i.quantity}x ${i.name}${vars}${obs} (${formatCurrency(i.price * i.quantity)})`;
        }).join('%0A');

        const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const mesaInfo = tableLabel ? `📍 *${tableLabel}*%0A%0A` : '';
        const text = `Hola Bloom! 👋 Quiero pedir:%0A%0A${mesaInfo}${itemsList}%0A%0A*Total: ${formatCurrency(cartTotal)}*`;
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

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

    const categoryNavItems: { id: string; cat: any; label: string }[] = [
        { id: "all", cat: ALL_CATEGORIES, label: "Todos" },
        ...(platoDiaProduct ? [{ id: "v-pd", cat: PLATO_DIA_CAT, label: "Plato del Día" }] : []),
        ...(platosDiariosCat ? [{ id: "v-pds", cat: PLATOS_DIARIOS_CAT, label: "Platos Diarios" }] : []),
        ...categories.map((c) => ({ id: String(c.id), cat: c, label: c.name })),
    ];

    const isSameCategory = (a: any, b: any) => {
        if (!a || !b) return false;
        if (a.isAll && b.isAll) return true;
        if (a.isAll || b.isAll) return false;
        if (a.virtual && b.virtual) return a.id === b.id;
        return a.id === b.id;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.cream }}>
                <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: `${fk.yellow}`, borderTopColor: fk.primary }} />
                <p className="font-black text-sm uppercase tracking-[0.2em]" style={{ color: fk.primary }}>
                    Cargando menú…
                </p>
            </div>
        );
    }

    if (orderSent) return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: fk.cream }}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border-2 border-amber-100 space-y-4">
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
                ) : checkoutInfo.type === 'tribunales' ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl py-4 px-5 text-left space-y-1">
                        <p className="text-xs font-black text-amber-600 uppercase tracking-wide mb-2">⚖️ Entrega en Tribunales</p>
                        {(() => {
                            const edif = TRIBUNALES_EDIFICIOS.find(e => e.id === checkoutInfo.tEdificio);
                            return (
                                <>
                                    <p className="text-sm font-bold text-gray-800">{edif?.label}</p>
                                    {checkoutInfo.tPiso && <p className="text-sm text-gray-600">{checkoutInfo.tPiso}</p>}
                                    {checkoutInfo.tOficina && <p className="text-sm text-gray-600">{checkoutInfo.tOficina}</p>}
                                    <p className="text-sm text-gray-600">Receptor: <strong>{checkoutInfo.tReceptor}</strong></p>
                                    <p className="text-xs text-gray-400">{checkoutInfo.tMesaEntradas ? '📋 Dejar en Mesa de Entradas' : '📞 Llamar al llegar'}</p>
                                </>
                            );
                        })()}
                    </div>
                ) : checkoutInfo.type === 'delivery' ? (
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
                    onClick={() => { setOrderSent(false); setCheckoutInfo({ name: '', phone: '', address: '', type: 'delivery', tEdificio: '', tPiso: '', tOficina: '', tReceptor: '', tMesaEntradas: false }); }}
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
        <main className="min-h-screen text-neutral-900 font-sans pb-32 selection:bg-amber-200/60 selection:text-neutral-900" style={{ backgroundColor: fk.cream }}>
            <VariantSelector
                product={variantProduct}
                isOpen={!!variantProduct}
                onClose={() => setVariantProduct(null)}
                onAddToOrder={(product, variants, observations) => {
                    addToCart(product, variants, observations);
                }}
                // Mesa: sin form de entrega — solo agregar al carrito
                {...(!tableId && {
                    onAddAndCheckout: (product: any, variants: any[], observations?: string, ci?: any) => {
                        if (!ci) return;
                        const newItem = {
                            ...product,
                            cartItemId: `${product.id}-${Date.now()}`,
                            quantity: 1,
                            variants,
                            observations,
                        };
                        const fullCart = [...cart, newItem];
                        setVariantProduct(null);
                        saveWebOrder(fullCart, ci as typeof checkoutInfo);
                    }
                })}
            />
            <CustomerAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
            <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            {/* Top bar — FoodKing style */}
            <div className="text-neutral-900 text-xs sm:text-sm font-semibold border-b border-amber-200/50" style={{ backgroundColor: fk.yellow }}>
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                        <span className="inline-flex items-center gap-1.5 leading-snug">
                            <Truck size={14} className="shrink-0" />
                            <span>
                                <span className="sm:hidden">Delivery · Pedí online</span>
                                <span className="hidden sm:inline">Delivery en la ciudad · Pedí online</span>
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <span className="hidden sm:inline-flex items-center gap-1.5 opacity-90">
                            <MapPin size={14} className="shrink-0" /> Mar del Plata
                        </span>
                        <a href="tel:+5492231234567" className="inline-flex items-center gap-1.5 font-bold hover:underline text-xs sm:text-sm">
                            <Phone size={14} className="shrink-0" />
                            <span className="hidden min-[400px]:inline">+54 9 223</span>
                            <span className="min-[400px]:hidden">Tel</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-amber-100/80 transition-all">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
                    <Link href="/" className="font-black text-lg sm:text-xl md:text-2xl tracking-tighter text-neutral-900 shrink-0 min-w-0">
                        BLOOM<span style={{ color: fk.yellow }}>.</span>
                    </Link>
                    <nav className="hidden xl:flex items-center gap-8 text-[15px] font-bold text-neutral-700">
                        <Link href="/" className="hover:opacity-80 transition-opacity" style={{ color: fk.primary }}>
                            Inicio
                        </Link>
                        <button type="button" onClick={() => { setSelectedCategory(ALL_CATEGORIES); setSearchQuery(""); }} className="hover:opacity-80 transition-opacity">
                            Menú
                        </button>
                        <Link href="/about" className="hover:text-neutral-900 transition-colors">
                            Nosotros
                        </Link>
                        <Link href="/reservations" className="hover:text-neutral-900 transition-colors">
                            Reservas
                        </Link>
                    </nav>
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        <FoodKingMobileNavButton onOpen={() => setMobileNavOpen(true)} />
                        <Link
                            href="#menu-shop"
                            className="xl:hidden inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-white shadow-md active:scale-[0.98] whitespace-nowrap"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <ShoppingBag size={15} className="shrink-0" strokeWidth={2.5} />
                            Pedir ahora
                        </Link>
                        {tableLabel && (
                            <span className="text-white text-xs sm:text-sm font-black px-3 py-1.5 rounded-full whitespace-nowrap" style={{ backgroundColor: fk.dark }}>
                                {tableLabel}
                            </span>
                        )}
                        <button type="button" onClick={() => setIsAuthOpen(true)} className="p-2.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
                            <User size={20} className="text-neutral-800" strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="relative inline-flex items-center justify-center p-2.5 rounded-full text-white font-bold shadow-md hover:opacity-95 transition-opacity"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <ShoppingBag size={20} strokeWidth={2.5} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 text-[10px] font-black min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: fk.yellow, color: fk.dark }}>
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-2.5 border-t border-amber-50 flex flex-wrap items-center gap-2 text-sm bg-[#fffdf8]/90">
                    <Link href="/" className="text-neutral-500 hover:text-neutral-800 font-semibold">
                        Inicio
                    </Link>
                    <span className="text-neutral-300">/</span>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory(ALL_CATEGORIES);
                            setSearchQuery("");
                        }}
                        className="font-semibold hover:underline"
                        style={{ color: fk.primary }}
                    >
                        Menú
                    </button>
                    <span className="text-neutral-300">/</span>
                    <span className="font-black text-neutral-800">{selectedCategory?.name ?? "Menú"}</span>
                </div>
            </header>

            <div id="menu-shop" className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 xl:px-8 scroll-mt-28">
                {/* Vista shop FoodKing: sidebar (categorías + precio) + grilla */}
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 pb-4 border-b border-amber-100">
                        <div>
                            <p className="font-bold uppercase tracking-[0.15em] text-xs mb-1" style={{ color: fk.primary }}>
                                Shop
                            </p>
                            <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight">Menú Bloom</h1>
                            <p className="text-neutral-600 text-sm mt-2">
                                Mostrando <strong>{filteredProducts.length}</strong> producto{filteredProducts.length !== 1 ? "s" : ""}
                                {selectedCategory?.isAll ? "" : ` en ${selectedCategory?.name}`}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <label className="sr-only" htmlFor="menu-sort">
                                Ordenar por precio
                            </label>
                            <select
                                id="menu-sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="w-full sm:w-auto rounded-full border-2 border-amber-100 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 focus:border-amber-300 focus:outline-none cursor-pointer"
                            >
                                <option value="default">Ordenar por: predeterminado</option>
                                <option value="price-asc">Ordenar por precio: menor a mayor</option>
                                <option value="price-desc">Ordenar por precio: mayor a menor</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCategory(ALL_CATEGORIES);
                                    setSearchQuery("");
                                    setPriceMin("");
                                    setPriceMax("");
                                }}
                                className="inline-flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide px-5 py-2.5 rounded-full border-2 hover:bg-amber-50 transition-colors whitespace-nowrap"
                                style={{ color: fk.primary, borderColor: `${fk.primary}40` }}
                            >
                                <ChevronLeft size={16} strokeWidth={2.5} /> Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,280px)_1fr] xl:gap-12 items-start">
                        {/* Sidebar — siempre visible (mobile: arriba) */}
                        <aside className="hidden xl:block w-full space-y-4 xl:sticky xl:top-28 order-1">
                            <div className="rounded-2xl bg-white border-2 border-amber-100 shadow-sm p-4">
                                <h3 className="font-black text-neutral-900 text-lg mb-3 pb-3 border-b border-amber-50 flex items-center gap-2">
                                    <SlidersHorizontal size={18} style={{ color: fk.primary }} />
                                    Categorías
                                </h3>
                                <nav className="space-y-1 max-h-[min(40vh,320px)] xl:max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
                                    {categoryNavItems.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory(item.cat);
                                                setSearchQuery("");
                                            }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                                isSameCategory(selectedCategory, item.cat) ? "text-white shadow-md" : "text-neutral-700 hover:bg-amber-50"
                                            }`}
                                            style={isSameCategory(selectedCategory, item.cat) ? { backgroundColor: fk.primary } : undefined}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="rounded-2xl bg-white border-2 border-amber-100 shadow-sm p-4">
                                <h3 className="font-black text-neutral-900 text-lg mb-1 pb-3 border-b border-amber-50">Filtrar por precio</h3>
                                <p className="text-xs text-neutral-500 mb-4">
                                    Rango en carta: {formatCurrency(priceBounds.min)} — {formatCurrency(priceBounds.max)}
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">Desde</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            placeholder={String(Math.max(0, Math.floor(priceBounds.min)))}
                                            value={priceMin}
                                            onChange={(e) => setPriceMin(e.target.value)}
                                            className="w-full rounded-xl border-2 border-amber-100 bg-[#fffdf8] px-3 py-2 text-sm font-bold text-neutral-900 focus:border-amber-300 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">Hasta</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            placeholder={String(Math.ceil(priceBounds.max))}
                                            value={priceMax}
                                            onChange={(e) => setPriceMax(e.target.value)}
                                            className="w-full rounded-xl border-2 border-amber-100 bg-[#fffdf8] px-3 py-2 text-sm font-bold text-neutral-900 focus:border-amber-300 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {(() => {
                                        const { min, max } = priceBounds;
                                        const span = Math.max(max - min, 1);
                                        const b = Math.round(min + span / 3);
                                        const c = Math.round(min + (2 * span) / 3);
                                        const presets: { label: string; min: string; max: string }[] = [
                                            { label: `Hasta ${formatCurrency(b)}`, min: "", max: String(Math.ceil(b)) },
                                            { label: `${formatCurrency(b)} – ${formatCurrency(c)}`, min: String(Math.floor(b)), max: String(Math.ceil(c)) },
                                            { label: `Desde ${formatCurrency(c)}`, min: String(Math.floor(c)), max: "" },
                                        ];
                                        return presets.map((p) => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                onClick={() => {
                                                    setPriceMin(p.min);
                                                    setPriceMax(p.max);
                                                }}
                                                className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-amber-100 bg-amber-50/80 hover:bg-amber-100 text-neutral-800 transition-colors"
                                            >
                                                {p.label}
                                            </button>
                                        ));
                                    })()}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPriceMin("");
                                        setPriceMax("");
                                    }}
                                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-black border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                                >
                                    Quitar filtro de precio
                                </button>
                            </div>
                        </aside>

                        <div className="min-w-0 space-y-5 w-full order-2">
                            {/* Móvil: categorías + precio en un desplegable */}
                            <div className="xl:hidden">
                                <button
                                    type="button"
                                    onClick={() => setMobileFiltersOpen((o) => !o)}
                                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white px-4 py-3.5 text-left shadow-sm active:bg-amber-50/50"
                                    aria-expanded={mobileFiltersOpen}
                                    aria-controls="menu-mobile-filters"
                                    id="menu-mobile-filters-trigger"
                                >
                                    <SlidersHorizontal className="shrink-0" size={22} style={{ color: fk.primary }} strokeWidth={2.25} />
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Categoría y precio</span>
                                        <span className="block font-black text-neutral-900 truncate">{selectedCategory?.name ?? "Menú"}</span>
                                        <span className="block text-xs text-neutral-500 truncate">
                                            {priceMin || priceMax
                                                ? `Precio: ${priceMin || "—"} – ${priceMax || "—"} ARS`
                                                : `Rango carta ${formatCurrency(priceBounds.min)} – ${formatCurrency(priceBounds.max)}`}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`shrink-0 text-neutral-400 transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`}
                                        size={24}
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </button>
                                <AnimatePresence initial={false}>
                                    {mobileFiltersOpen && (
                                        <motion.div
                                            id="menu-mobile-filters"
                                            role="region"
                                            aria-labelledby="menu-mobile-filters-trigger"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-2 rounded-2xl border-2 border-amber-100 bg-white p-4 shadow-sm space-y-5"
                                        >
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide text-neutral-500 mb-2">Categoría</p>
                                                <nav className="space-y-1 max-h-[min(45vh,280px)] overflow-y-auto pr-1">
                                                    {categoryNavItems.map((item) => (
                                                        <button
                                                            key={`mob-cat-${item.id}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCategory(item.cat);
                                                                setSearchQuery("");
                                                                setMobileFiltersOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                                                isSameCategory(selectedCategory, item.cat)
                                                                    ? "text-white shadow-md"
                                                                    : "text-neutral-700 hover:bg-amber-50"
                                                            }`}
                                                            style={
                                                                isSameCategory(selectedCategory, item.cat) ? { backgroundColor: fk.primary } : undefined
                                                            }
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </nav>
                                            </div>
                                            <div className="border-t border-amber-100 pt-4">
                                                <h3 className="font-black text-neutral-900 text-base mb-1">Filtrar por precio</h3>
                                                <p className="text-xs text-neutral-500 mb-3">
                                                    Rango en carta: {formatCurrency(priceBounds.min)} — {formatCurrency(priceBounds.max)}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">Desde</label>
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={0}
                                                            placeholder={String(Math.max(0, Math.floor(priceBounds.min)))}
                                                            value={priceMin}
                                                            onChange={(e) => setPriceMin(e.target.value)}
                                                            className="w-full rounded-xl border-2 border-amber-100 bg-[#fffdf8] px-3 py-2 text-sm font-bold text-neutral-900 focus:border-amber-300 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">Hasta</label>
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={0}
                                                            placeholder={String(Math.ceil(priceBounds.max))}
                                                            value={priceMax}
                                                            onChange={(e) => setPriceMax(e.target.value)}
                                                            className="w-full rounded-xl border-2 border-amber-100 bg-[#fffdf8] px-3 py-2 text-sm font-bold text-neutral-900 focus:border-amber-300 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {(() => {
                                                        const { min, max } = priceBounds;
                                                        const span = Math.max(max - min, 1);
                                                        const b = Math.round(min + span / 3);
                                                        const c = Math.round(min + (2 * span) / 3);
                                                        const presets: { label: string; min: string; max: string }[] = [
                                                            { label: `Hasta ${formatCurrency(b)}`, min: "", max: String(Math.ceil(b)) },
                                                            { label: `${formatCurrency(b)} – ${formatCurrency(c)}`, min: String(Math.floor(b)), max: String(Math.ceil(c)) },
                                                            { label: `Desde ${formatCurrency(c)}`, min: String(Math.floor(c)), max: "" },
                                                        ];
                                                        return presets.map((p) => (
                                                            <button
                                                                key={`mob-${p.label}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    setPriceMin(p.min);
                                                                    setPriceMax(p.max);
                                                                }}
                                                                className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-amber-100 bg-amber-50/80 hover:bg-amber-100 text-neutral-800 transition-colors"
                                                            >
                                                                {p.label}
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPriceMin("");
                                                        setPriceMax("");
                                                    }}
                                                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-black border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                                                >
                                                    Quitar filtro de precio
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setMobileFiltersOpen(false)}
                                                className="w-full py-3 rounded-xl text-sm font-black text-white shadow-md"
                                                style={{ backgroundColor: fk.primary }}
                                            >
                                                Ver productos
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {!selectedCategory?.isPlato && (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder={
                                            selectedCategory?.isAll
                                                ? "Buscar en todo el menú..."
                                                : `Buscar en ${selectedCategory?.name ?? "menú"}...`
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border-2 border-amber-100 rounded-full py-3.5 pl-12 pr-4 text-neutral-900 placeholder:text-neutral-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/80 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            )}

                            <div
                                className={
                                    selectedCategory?.isPlato ? "flex justify-center" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6"
                                }
                            >
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleProductClick(product)}
                                        onKeyDown={(e) => e.key === "Enter" && handleProductClick(product)}
                                        className={`group bg-white rounded-3xl overflow-hidden border-2 border-amber-100/80 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col ${
                                            selectedCategory?.isPlato ? "w-full max-w-sm" : ""
                                        }`}
                                    >
                                        <div className="relative w-full aspect-[4/3] bg-amber-50/40">
                                            {product.image_url ? (
                                                <Image src={product.image_url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl bg-neutral-100">🍽️</div>
                                            )}
                                            {selectedCategory?.isPlato && (
                                                <span
                                                    className="absolute top-3 left-3 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow"
                                                    style={{ backgroundColor: fk.primary }}
                                                >
                                                    ⭐ Plato del Día
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <h3 className="font-black text-neutral-900 text-base leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                                            <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">{product.description}</p>
                                            <div className="flex flex-col gap-3 mt-auto pt-2 border-t border-amber-50">
                                                <span className="font-black text-xl" style={{ color: fk.primary }}>
                                                    {formatCurrency(product.price)}
                                                </span>
                                                <span
                                                    className="text-center font-black text-xs uppercase tracking-wide py-3 rounded-full border-2 transition-colors group-hover:text-white group-hover:bg-orange-600"
                                                    style={{ borderColor: fk.primary, color: fk.primary }}
                                                >
                                                    Agregar al pedido
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredProducts.length === 0 && (
                                <div className="text-center py-16 rounded-3xl border-2 border-dashed border-amber-200 bg-white/60">
                                    <p className="text-neutral-500 font-medium">No hay productos con estos filtros.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCategory(ALL_CATEGORIES);
                                            setSearchQuery("");
                                            setPriceMin("");
                                            setPriceMax("");
                                        }}
                                        className="mt-4 text-sm font-black underline"
                                        style={{ color: fk.primary }}
                                    >
                                        Restablecer filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
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
                                style={{ backgroundColor: fk.yellow, color: fk.dark }}
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
                            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-[#fffdf8] z-[60] shadow-2xl flex flex-col font-sans border-l border-amber-100"
                        >
                            <div className="p-5 border-b border-amber-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
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
                                                            <p className="text-orange-500 text-xs italic mt-0.5 leading-relaxed">
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

                                {/* Vista formulario entrega */}
                                {!tableId && showCheckoutForm && (
                                    <div className="space-y-3">
                                        <p className="font-black text-gray-900 text-base">¿Cómo recibís el pedido?</p>

                                        {/* Tipo — 3 opciones */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {([
                                                { id: 'delivery',    label: '🛵 Delivery' },
                                                { id: 'tribunales',  label: '⚖️ Tribunales' },
                                                { id: 'retiro',      label: '🏃 Retiro' },
                                            ] as const).map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setCheckoutInfo(p => ({ ...p, type: t.id, tEdificio: '', tPiso: '', tOficina: '', tReceptor: '', tMesaEntradas: false }))}
                                                    className={`py-2.5 rounded-xl font-bold text-xs transition-all ${checkoutInfo.type === t.id ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                                                    style={checkoutInfo.type === t.id ? { backgroundColor: fk.primary } : undefined}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Nombre + Teléfono siempre visibles */}
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Nombre completo *"
                                                value={checkoutInfo.name}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, name: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
                                            />
                                            {checkoutErrors.name && <p className="text-red-500 text-xs mt-1">{checkoutErrors.name}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="tel"
                                                placeholder="Teléfono / WhatsApp *"
                                                value={checkoutInfo.phone}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, phone: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
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
                                                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
                                                />
                                                {checkoutErrors.address && <p className="text-red-500 text-xs mt-1">{checkoutErrors.address}</p>}
                                            </div>
                                        )}

                                        {/* ⚖️ TRIBUNALES form */}
                                        {checkoutInfo.type === 'tribunales' && (
                                            <div className="space-y-3 pt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-wide">1. Edificio</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {TRIBUNALES_EDIFICIOS.map(e => (
                                                        <button
                                                            key={e.id}
                                                            onClick={() => setCheckoutInfo(p => ({ ...p, tEdificio: e.id, tPiso: '' }))}
                                                            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${checkoutInfo.tEdificio === e.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-orange-200'}`}
                                                        >
                                                            <div>
                                                                <p className={`font-bold text-sm ${checkoutInfo.tEdificio === e.id ? 'text-orange-700' : 'text-gray-800'}`}>{e.label}</p>
                                                                <p className="text-xs text-gray-400">{e.sub}</p>
                                                            </div>
                                                            {checkoutInfo.tEdificio === e.id && <span className="text-orange-500 text-lg">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                                {checkoutErrors.tEdificio && <p className="text-red-500 text-xs">{checkoutErrors.tEdificio}</p>}

                                                {/* Piso (solo Edificio Central) */}
                                                {checkoutInfo.tEdificio === 'central' && (
                                                    <div>
                                                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">2. Piso / Área</p>
                                                        <div className="space-y-1.5">
                                                            {TRIBUNALES_PISOS_CENTRAL.map(piso => (
                                                                <button
                                                                    key={piso}
                                                                    onClick={() => setCheckoutInfo(p => ({ ...p, tPiso: piso }))}
                                                                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${checkoutInfo.tPiso === piso ? 'border-orange-500 bg-orange-50 font-bold text-orange-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-orange-200'}`}
                                                                >
                                                                    {piso}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Datos del destinatario */}
                                                <div>
                                                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">{checkoutInfo.tEdificio === 'central' ? '3.' : '2.'} Datos para el repartidor</p>
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Juzgado / Oficina (ej: Garantías 4)"
                                                            value={checkoutInfo.tOficina}
                                                            onChange={e => setCheckoutInfo(p => ({ ...p, tOficina: e.target.value }))}
                                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-orange-400 transition-all"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Nombre de quien recibe *"
                                                            value={checkoutInfo.tReceptor}
                                                            onChange={e => setCheckoutInfo(p => ({ ...p, tReceptor: e.target.value }))}
                                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.tReceptor ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
                                                        />
                                                        {checkoutErrors.tReceptor && <p className="text-red-500 text-xs">{checkoutErrors.tReceptor}</p>}
                                                        <button
                                                            onClick={() => setCheckoutInfo(p => ({ ...p, tMesaEntradas: !p.tMesaEntradas }))}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${checkoutInfo.tMesaEntradas ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checkoutInfo.tMesaEntradas ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                                                {checkoutInfo.tMesaEntradas && <span className="text-white text-xs font-black">✓</span>}
                                                            </div>
                                                            Dejar en Mesa de Entradas
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer fijo — total + botones */}
                            <div className="shrink-0 p-5 bg-white border-t border-gray-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                                </div>

                                <div className="space-y-3">
                                    {/* Prompt login */}
                                    {!tableId && (
                                        <button
                                            onClick={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-amber-200 bg-amber-50/80 hover:bg-amber-100/90 transition-colors"
                                        >
                                            <User size={16} className="shrink-0" style={{ color: fk.primary }} />
                                            <p className="text-xs font-black text-left" style={{ color: fk.dark }}>
                                                Iniciá sesión y acumulá puntos — hasta 15% OFF
                                            </p>
                                        </button>
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
            <SiteFooter />
        </main>
    );
}

export default function MenuPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.cream }}>
                    <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: fk.yellow, borderTopColor: fk.primary }} />
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

// Helper for Mock Images
function getCategoryImage(name: string) {
    const n = name.toLowerCase();
    if (n.includes('milanesa')) return "/images/categories/milanesas.png";
    if (n.includes('pasta') || n.includes('sorrentino') || n.includes('raviole') || n.includes('ñoqui') || n.includes('noqui')) return "/images/categories/pastas.png";
    if (n.includes('pizza')) return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop";
    if (n.includes('hamburguesa') || n.includes('burger')) return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop";
    if (n.includes('postre')) return "/images/categories/postres.png";
    if (n.includes('bebida')) return "/images/categories/bebidas.png";
    if (n.includes('ensalada')) return "/images/categories/ensaladas.png";
    if (n.includes('tortilla')) return "/images/categories/tortilla.png";
    if (n.includes('empanada')) return "/images/categories/empanadas.png";
    if (n.includes('café') || n.includes('cafe') || n.includes('cafetería') || n.includes('cafeteria')) return "/images/categories/cafeteria.png";
    if (n.includes('desayuno') || n.includes('merienda')) return "/images/categories/desayunos.png";
    if (n.includes('promo')) return "/images/categories/promociones.png";
    if (n.includes('jugo') || n.includes('licuado')) return "/images/categories/jugos.png";
    if (n.includes('panif') || n.includes('pan')) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop";
    if (n.includes('pastel') || n.includes('torta') || n.includes('alfajor')) return "/images/categories/pasteleria.png";
    if (n.includes('wrap')) return "/images/categories/wraps.png";
    if (n.includes('plato') || n.includes('almuerzo') || n.includes('cena') || n.includes('diario')) return "/images/categories/platos-diarios.png";
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop";
}
