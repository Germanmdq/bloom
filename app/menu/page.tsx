"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronLeft, Plus, Minus, X, Search, MessageCircle, Bike, CreditCard } from "lucide-react";
import { toast, Toaster } from "sonner";
import { VariantSelector } from "@/components/pos/VariantSelector"; // Reusing logic
// Font (assuming Inter is global, but styling explicitly)

// --- HELPERS ---
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

const WHATSAPP_NUMBER = "5491112345678";

// --- MAIN COMPONENT ---
export default function PublicMenuPage() {
    const supabase = createClient();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Navigation State
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null); // Null = Home (Categories View)
    const [searchQuery, setSearchQuery] = useState("");

    // Cart & Checkout State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    // Variant Selection State
    const [variantProduct, setVariantProduct] = useState<any>(null);

    // Helpers for Variant Logic (Duplicated from POS/page for simplicity here)
    const HAS_VARIANTS = (p: any) => {
        const name = p.name.toLowerCase();
        return name.includes('milanesa') || name.includes('hamburguesa') || name.includes('pizza') || name.includes('lomo') || name.includes('empanada') || name.includes('pasta') || name.includes('sorrentinos') || name.includes('ravioles') || name.includes('noquis') || name.includes('ñoquis');
    };

    // FETCH DATA
    useEffect(() => {
        const fetchMenu = async () => {
            const { data: cats } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
            if (cats) setCategories(cats);

            const { data: prods } = await supabase.from('products').select('*').eq('active', true);
            if (prods) setProducts(prods);

            setLoading(false);
        };
        fetchMenu();
    }, []);

    // FILTER LOGIC
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory ? p.category_id === selectedCategory.id : true;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // CART OPERATIONS
    const addToCart = (product: any, variants: any[] = []) => {
        setCart(prev => {
            const variantKey = variants.map(v => v.name).sort().join('|');
            const cartItemId = `${product.id}-${variantKey}`;
            const extrasPrice = variants.reduce((sum, v) => sum + (v.price || 0), 0);
            const unitPrice = product.price + extrasPrice;

            const existing = prev.find(item => item.cartItemId === cartItemId);

            toast.success(`Agregado: ${product.name}`);

            if (existing) {
                return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, cartItemId, price: unitPrice, quantity: 1, variants }];
        });
        setVariantProduct(null);
    };

    const handleProductClick = (product: any) => {
        if (HAS_VARIANTS(product)) {
            setVariantProduct(product);
        } else {
            addToCart(product);
        }
    };

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }).filter(item => item.quantity > 0));
    };

    // CHECKOUT HANDLERS
    const handleMercadoPagoCheckout = async () => {
        setIsPaying(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart }),
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
            return `• ${i.quantity}x ${i.name}${vars} (${formatCurrency(i.price * i.quantity)})`;
        }).join('%0A');

        const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const text = `Hola Bloom! 👋 Quiero pedir:%0A%0A${itemsList}%0A%0A*Total: ${formatCurrency(cartTotal)}*%0A%0AEnvío a domicilio 🛵`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;

    // --- RENDER ---
    return (
        <main className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans pb-32 selection:bg-black selection:text-white">
            <Toaster position="top-center" />
            <VariantSelector product={variantProduct} isOpen={!!variantProduct} onClose={() => setVariantProduct(null)} onAddToOrder={addToCart} />

            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 transition-all">
                <div className="container mx-auto max-w-2xl flex items-center justify-between">
                    {selectedCategory ? (
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="flex items-center gap-1 text-blue-600 font-medium hover:opacity-80 transition-opacity"
                        >
                            <ChevronLeft size={22} strokeWidth={2.5} />
                            <span className="text-lg">Menú</span>
                        </button>
                    ) : (
                        <Link href="/" className="font-bold text-xl tracking-tight text-gray-900">
                            BLOOM
                        </Link>
                    )}

                    <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <ShoppingBag size={20} className="text-gray-900" strokeWidth={2.5} />
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>}
                    </button>
                </div>
            </header>

            <div className="container mx-auto max-w-2xl px-6 py-8">

                {/* STATE 1: CATEGORY GRID (HOME) */}
                {!selectedCategory && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nuestro Menú</h1>
                            <p className="text-gray-500 font-medium text-lg leading-relaxed">Selecciona una categoría para comenzar.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat)}
                                    className="group relative h-48 rounded-3xl overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-all duration-300"
                                >
                                    {/* Background Image (Mock based on cat name or generic) */}
                                    <div className="absolute inset-0 bg-gray-100">
                                        <Image
                                            src={getCategoryImage(cat.name)}
                                            alt={cat.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                                    </div>

                                    <div className="absolute bottom-6 left-6 text-left">
                                        <span className="text-3xl mb-1 block">{cat.icon}</span>
                                        <h3 className="text-white font-bold text-2xl tracking-tight">{cat.name}</h3>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STATE 2: PRODUCT LIST (CATEGORY SELECTED) */}
                {selectedCategory && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="space-y-1 pb-4 border-b border-gray-100">
                            <span className="text-3xl mb-2 block">{selectedCategory.icon}</span>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{selectedCategory.name}</h1>
                        </div>

                        {/* Search in Category */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Buscar en ${selectedCategory.name}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border-0 ring-1 ring-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                            />
                        </div>

                        <div className="space-y-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    className="group bg-white rounded-3xl p-4 flex gap-5 shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer active:scale-[0.98]"
                                >
                                    {/* Image */}
                                    <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shrink-0 relative">
                                        {product.image_url ? (
                                            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🍽️</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                                            <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg text-sm">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{product.description}</p>
                                        <div className="mt-3 flex">
                                            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Plus size={14} strokeWidth={3} /> Agregar
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
                                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tu Pedido</h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                    <X size={20} />
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
                                                    <p className="text-gray-500 text-xs mb-2 leading-relaxed">
                                                        {item.variants.map((v: any) => v.name).join(', ')}
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

                            <div className="p-6 bg-gray-50 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-4xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleMercadoPagoCheckout}
                                        disabled={!cart.length || isPaying}
                                        className="w-full bg-[#009EE3] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#008CC9] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                    >
                                        {isPaying ? 'Procesando...' : <><CreditCard size={20} /> Pagar con Mercado Pago</>}
                                    </button>

                                    <button
                                        onClick={handleWhatsAppCheckout}
                                        disabled={!cart.length}
                                        className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                                    >
                                        <MessageCircle size={20} fill="white" /> Coordinar por WhatsApp
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}

// Helper for Mock Images
function getCategoryImage(name: string) {
    const n = name.toLowerCase();
    if (n.includes('milanesa')) return "https://images.unsplash.com/photo-1599921841143-819065a55cc6?q=80&w=2531&auto=format&fit=crop";
    if (n.includes('pasta')) return "https://images.unsplash.com/photo-1551183053-bf91b1d5a185?q=80&w=2574&auto=format&fit=crop";
    if (n.includes('pizza')) return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop";
    if (n.includes('burger') || n.includes('hamburguesa')) return "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2565&auto=format&fit=crop";
    if (n.includes('postre') || n.includes('dulce')) return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=2574&auto=format&fit=crop";
    if (n.includes('bebida') || n.includes('trago')) return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=2574&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2670&auto=format&fit=crop";
}
