"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronLeft, Plus, Minus, X, Search, MessageCircle, Bike, CreditCard, User } from "lucide-react";
import { CustomerAuthModal } from "@/components/Menu/CustomerAuthModal";
import { toast } from "sonner";
import { VariantSelector } from "@/components/pos/VariantSelector"; // Reusing logic
// Font (assuming Inter is global, but styling explicitly)

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

    // Navigation State
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Cart & Checkout State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [orderSent, setOrderSent] = useState(false);

    // Checkout form state
    const [showCheckoutForm, setShowCheckoutForm] = useState(false);
    const [checkoutInfo, setCheckoutInfo] = useState({ name: '', phone: '', address: '', type: 'delivery' as 'delivery' | 'retiro' });
    const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

    // Variant Selection State
    const [variantProduct, setVariantProduct] = useState<any>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    // Helpers for Variant Logic (Duplicated from POS/page for simplicity here)
    const HAS_VARIANTS = (p: any) => {
        const name = p.name.toLowerCase();
        return name.includes('milanesa') || name.includes('hamburguesa') || name.includes('pizza') || name.includes('lomo') || name.includes('empanada') || name.includes('pasta') || name.includes('sorrentinos') || name.includes('ravioles') || name.includes('noquis') || name.includes('ñoquis') || name.includes('pechuga') || name.includes('patamuslo') || name.includes('filet') || name.includes('bife') || name.includes('guarnición') || name.includes('guarnicion');
    };

    // FETCH DATA
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
                // Auto-seleccionar categoría si viene por URL
                if (catParam) {
                    if (catParam.toLowerCase().includes('plato del d')) {
                        setSelectedCategory({ id: 'virtual-plato-dia', name: 'Plato del Día', virtual: true, isPlato: true });
                    } else if (catParam.toLowerCase().includes('plato') && catParam.toLowerCase().includes('diario')) {
                        setSelectedCategory({ id: 'virtual-platos-diarios', name: 'Platos Diarios', virtual: true, isPlatos: true });
                    } else {
                        const match = unique.find((c: any) =>
                            c.name.toLowerCase().includes(catParam.toLowerCase()) ||
                            catParam.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
                        );
                        if (match) setSelectedCategory(match);
                    }
                }
            }
            if (prods) setProducts(prods);
            if (settings?.whatsapp) setWhatsappNumber(settings.whatsapp);
            // Marcar el plato del día desde app_settings
            if (settings?.plato_del_dia_id && prods) {
                const featured = prods.find((p: any) => p.id === settings.plato_del_dia_id);
                if (featured) {
                    // Mutate en memoria para no alterar el array original
                    prods.forEach((p: any) => { p.kind = p.id === settings.plato_del_dia_id ? 'plato_del_dia' : (p.kind === 'plato_del_dia' ? 'menu' : p.kind); });
                }
            }
            setLoading(false);
        };
        fetchMenu();
    }, []);

    // Platos Diarios category id (real)
    const platosDiariosCat = categories.find(c => c.name.toLowerCase().includes('plato') && c.name.toLowerCase().includes('diario'));
    const platoDiaProduct = products.find(p => p.kind === 'plato_del_dia');

    // FILTER LOGIC
    const filteredProducts = products.filter(p => {
        if (!selectedCategory) return true;
        if (selectedCategory.virtual && selectedCategory.isPlato) {
            // Virtual: solo el plato del día
            return p.kind === 'plato_del_dia';
        }
        if (selectedCategory.virtual && selectedCategory.isPlatos) {
            // Virtual: todos los platos diarios excepto el destacado
            return platosDiariosCat ? p.category_id === platosDiariosCat.id : false;
        }
        const matchesCategory = p.category_id === selectedCategory.id;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    }).filter(p => {
        if (!selectedCategory || (!selectedCategory.virtual)) {
            return p.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

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
        setCheckoutErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleMercadoPagoCheckout = async () => {
        if (!tableId && !showCheckoutForm) {
            setShowCheckoutForm(true);
            return;
        }
        if (!tableId && !validateCheckoutForm()) return;

        setIsPaying(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, customer: !tableId ? checkoutInfo : null }),
            });
            const data = await response.json();
            if (data.url) window.location.href = data.url;
            else { toast.error("Error iniciando pago"); setIsPaying(false); }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
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

    // TABLE SELF-ORDER: send directly to kitchen
    const handleTableCheckout = async () => {
        if (cart.length === 0 || !tableId) return;
        setIsPaying(true);
        try {
            const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
            const items = cart.map(i => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                variants: i.variants || [],
            }));

            await supabase.from('kitchen_tickets').insert({
                table_id: tableId,
                items,
                status: 'PENDING',
            });

            await supabase.from('salon_tables')
                .update({ status: 'OCCUPIED', total })
                .eq('id', tableId);

            setOrderSent(true);
            setIsCartOpen(false);
            setCart([]);
        } catch (error) {
            console.error(error);
            toast.error("Error al enviar el pedido, intentá de nuevo");
        } finally {
            setIsPaying(false);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;

    if (orderSent) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-xl">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">✓</span>
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">¡Pedido enviado!</h1>
                <p className="text-gray-500 font-medium mb-1">
                    Tu pedido fue enviado a cocina.
                </p>
                {tableLabel && (
                    <p className="text-lg font-black text-gray-900 mt-4 bg-gray-100 rounded-2xl py-3 px-6 inline-block">
                        {tableLabel}
                    </p>
                )}
                <p className="text-sm text-gray-400 mt-6">
                    En breve el mozo se acerca con tu pedido.
                </p>
            </div>
        </div>
    );

    // --- RENDER ---
    return (
        <main className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans pb-32 selection:bg-black selection:text-white">
            <VariantSelector product={variantProduct} isOpen={!!variantProduct} onClose={() => setVariantProduct(null)} onAddToOrder={(product, variants, observations) => addToCart(product, variants, observations)} />
            <CustomerAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-xl border-b border-amber-100/60 transition-all">
                {/* Nav principal */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-amber-100/40">
                    <Link href="/" className="font-black text-xl tracking-tighter text-gray-900">
                        BLOOM<span className="text-orange-500">.</span>
                    </Link>
                    <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-gray-500">
                        <button onClick={() => setSelectedCategory(null)} className="hover:text-gray-900 transition-colors">Menú</button>
                        <Link href="/" className="hover:text-gray-900 transition-colors">Inicio</Link>
                        <Link href="/cuenta" className="hover:text-gray-900 transition-colors">Mi Cuenta</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        {tableLabel && (
                            <span className="bg-black text-white text-sm font-black px-4 py-1.5 rounded-full">
                                {tableLabel}
                            </span>
                        )}
                        <button onClick={() => setIsAuthOpen(true)} className="p-2 bg-white rounded-full hover:bg-orange-50 border border-amber-100 transition-colors shadow-sm">
                            <User size={20} className="text-gray-900" strokeWidth={2} />
                        </button>
                        <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white rounded-full hover:bg-orange-50 border border-amber-100 transition-colors shadow-sm">
                            <ShoppingBag size={20} className="text-gray-900" strokeWidth={2.5} />
                            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>}
                        </button>
                    </div>
                </div>

                {/* Breadcrumb cuando hay categoría seleccionada */}
                {selectedCategory && (
                    <div className="px-6 py-2 flex items-center gap-2 text-sm">
                        <button onClick={() => { setSelectedCategory(null); setSearchQuery(""); }} className="flex items-center gap-1 text-orange-500 font-semibold hover:text-orange-600 transition-colors">
                            <ChevronLeft size={16} strokeWidth={2.5} />
                            Menú
                        </button>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-600 font-medium">{selectedCategory.name}</span>
                    </div>
                )}
            </header>

            <div className="w-full py-3 px-4 sm:px-[70px] sm:py-4">

                {/* STATE 1: CATEGORY GRID (HOME) */}
                {!selectedCategory && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nuestro Menú</h1>
                            <p className="text-gray-500 font-medium text-lg leading-relaxed">Selecciona una categoría para comenzar.</p>
                        </div>

                        {/* Buscador global */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar en todo el menú..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white/80 border-0 ring-1 ring-amber-100 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300 outline-none transition-shadow shadow-sm"
                            />
                        </div>

                        {/* Resultados de búsqueda global */}
                        {searchQuery.trim() !== "" ? (
                            <div className="space-y-4">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">No se encontraron productos.</div>
                                ) : (
                                    products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className="group bg-white rounded-3xl p-4 flex gap-5 shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="w-36 h-28 bg-gray-100 rounded-2xl overflow-hidden shrink-0 relative">
                                                {product.image_url ? (
                                                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🍽️</div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                                                    <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg text-sm">{formatCurrency(product.price)}</span>
                                                </div>
                                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{product.description}</p>
                                                <div className="mt-3 flex">
                                                    <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <Plus size={14} strokeWidth={3} /> Agregar
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                        <div className="space-y-3">
                            {/* Plato del Día — destacado */}
                            {platoDiaProduct && (
                                <button
                                    onClick={() => setSelectedCategory(PLATO_DIA_CAT)}
                                    className="group relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
                                >
                                    <div className="absolute inset-0">
                                        <Image src={platoDiaProduct.image_url || getCategoryImage('plato')} alt="Plato del Día" fill className="object-cover group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" />
                                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/65 transition-colors duration-300" />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                                        <span className="text-xs font-black uppercase tracking-widest text-orange-300 mb-1">⭐ Destacado de hoy</span>
                                        <h3 className="text-white font-black text-3xl leading-tight drop-shadow-lg">Plato del Día</h3>
                                        <p className="text-white/70 text-sm font-medium mt-1 drop-shadow">{platoDiaProduct.name}</p>
                                    </div>
                                </button>
                            )}

                            {/* Platos Diarios */}
                            {platosDiariosCat && (
                                <button
                                    onClick={() => setSelectedCategory(PLATOS_DIARIOS_CAT)}
                                    className="group relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
                                >
                                    <div className="absolute inset-0">
                                        <Image src={getCategoryImage('plato diario')} alt="Platos Diarios" fill className="object-cover group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" />
                                        <div className="absolute inset-0 bg-black/45 group-hover:bg-black/60 transition-colors duration-300" />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                                        <h3 className="text-white font-black text-2xl leading-tight drop-shadow-lg">Platos Diarios</h3>
                                    </div>
                                </button>
                            )}

                            {/* Promociones — ancho completo */}
                            {categories
                                .filter(cat => cat.name.toLowerCase().includes('promo'))
                                .map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat)}
                                        className="group relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
                                    >
                                        <div className="absolute inset-0">
                                            <Image src={getCategoryImage(cat.name)} alt={cat.name} fill className="object-cover group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" />
                                            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/60 transition-colors duration-300" />
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                                            <h3 className="text-white font-black text-2xl leading-tight drop-shadow-lg">{cat.name}</h3>
                                        </div>
                                    </button>
                                ))
                            }

                            {/* Resto de categorías — 3 columnas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {categories
                                    .filter(cat => !cat.name.toLowerCase().includes('plato') && !cat.name.toLowerCase().includes('promo'))
                                    .map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat)}
                                            className="group relative h-44 rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 w-full"
                                        >
                                            <div className="absolute inset-0">
                                                <Image src={getCategoryImage(cat.name)} alt={cat.name} fill className="object-cover group-hover:scale-110 group-hover:blur-[2px] transition-all duration-500" />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-colors duration-300" />
                                            </div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                                                <span className="text-2xl block leading-none mb-2 drop-shadow-lg">{cat.icon}</span>
                                                <h3 className="text-white font-black text-sm leading-tight drop-shadow-lg">{cat.name}</h3>
                                            </div>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                        )}
                    </div>
                )}

                {/* STATE 2: PRODUCT LIST (CATEGORY SELECTED) */}
                {selectedCategory && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-300">

                        {/* Header con botón volver integrado */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{selectedCategory.name}</h1>
                            <button
                                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                                className="flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-50"
                            >
                                <ChevronLeft size={15} strokeWidth={2.5} /> Menú
                            </button>
                        </div>

                        {/* Search in Category — oculto para Plato del Día (solo 1 producto) */}
                        {!selectedCategory.isPlato && (
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={`Buscar en ${selectedCategory.name}...`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/80 border-0 ring-1 ring-amber-100 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300 outline-none transition-shadow shadow-sm"
                                />
                            </div>
                        )}

                        {/* Grid productos — centrado si es Plato del Día */}
                        <div className={
                            selectedCategory.isPlato
                                ? "flex justify-center"
                                : "grid grid-cols-2 sm:grid-cols-4 gap-3"
                        }>
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer active:scale-[0.97] flex flex-col ${selectedCategory.isPlato ? 'w-64 sm:w-80' : ''}`}
                                >
                                    <div className="relative w-full aspect-[4/3] bg-gray-100">
                                        {product.image_url ? (
                                            <Image src={product.image_url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                                        )}
                                        {selectedCategory.isPlato && (
                                            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full">⭐ Plato del Día</span>
                                        )}
                                    </div>
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-1 mb-2">{product.description}</p>
                                        <div className="flex flex-col gap-2 mt-auto">
                                            <span className="font-black text-gray-900 text-sm">{formatCurrency(product.price)}</span>
                                            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl text-center group-hover:bg-orange-600 transition-colors">
                                                Agregar
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-10 text-gray-400">No hay productos aquí.</div>
                        )}
                    </div>
                )}

            </div>

            {/* CART & CHECKOUT UI */}
            <AnimatePresence>
                {/* Floating Bottom Bar (Mobile) */}
                {cartCount > 0 && !isCartOpen && (
                    <motion.div key="mobile-cart-bar" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-black text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between font-bold"
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
                            className="bg-black text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            <ShoppingBag size={24} />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">{cartCount}</span>
                        </button>
                    </motion.div>
                )}

                {/* Cart Modal / Drawer */}
                {isCartOpen && (
                    <>
                        <motion.div key="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
                        <motion.div
                            key="cart-drawer"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white z-[60] shadow-2xl flex flex-col font-sans"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tu Pedido</h2>
                                    {tableLabel && (
                                        <p className="text-sm font-bold text-gray-500 mt-0.5">{tableLabel}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-full transition-colors"
                                >
                                    + Seguir eligiendo
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
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
                            </div>

                            <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-4">

                                {/* FORM de datos de entrega (solo sin mesa) */}
                                {!tableId && showCheckoutForm && (
                                    <div className="space-y-3 bg-white rounded-2xl p-4 border border-gray-100">
                                        <p className="font-black text-gray-900 text-sm">¿Cómo recibís el pedido?</p>

                                        {/* Tipo */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['delivery', 'retiro'] as const).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setCheckoutInfo(p => ({ ...p, type: t }))}
                                                    className={`py-2.5 rounded-xl font-bold text-sm transition-all ${checkoutInfo.type === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {t === 'delivery' ? '🛵 Delivery' : '🏃 Retiro en local'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Nombre */}
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

                                        {/* Teléfono */}
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
                                    </div>
                                )}

                                {/* Total */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                                </div>

                                <div className="space-y-3">
                                    {/* Prompt login */}
                                    {!tableId && (
                                        <button
                                            onClick={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors"
                                        >
                                            <User size={16} className="text-orange-500 shrink-0" />
                                            <p className="text-xs font-black text-orange-600 text-left">Iniciá sesión y acumulá puntos — hasta 15% OFF</p>
                                        </button>
                                    )}

                                    {tableId ? (
                                        <button
                                            onClick={handleTableCheckout}
                                            disabled={!cart.length || isPaying}
                                            className="w-full bg-black text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                        >
                                            {isPaying ? 'Enviando...' : '✓ Cerrar Pedido'}
                                        </button>
                                    ) : (
                                        <div>
                                            <button
                                                onClick={handleMercadoPagoCheckout}
                                                disabled={!cart.length || isPaying}
                                                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                            >
                                                {isPaying ? 'Procesando...' : showCheckoutForm
                                                    ? <><CreditCard size={20} /> Confirmar y Pagar</>
                                                    : <><CreditCard size={20} /> Pagar con billetera digital</>
                                                }
                                            </button>
                                            {!showCheckoutForm && (
                                                <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
                                                    <span className="text-[10px] text-gray-400 font-medium mr-1">Aceptamos:</span>
                                                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#009EE3]/10 text-[#009EE3]">Mercado Pago</span>
                                                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#7B3FE4]/10 text-[#7B3FE4]">MODO</span>
                                                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#5C2D91]/10 text-[#5C2D91]">Ualá</span>
                                                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#FF6200]/10 text-[#FF6200]">Naranja X</span>
                                                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500">+ otras</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}

export default function MenuPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>}>
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
