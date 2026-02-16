"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { OrderCart } from "@/components/pos/OrderCart";
import { Search, ChevronLeft, ShoppingBag, Plus, Sparkles, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// POS HEADER
function Header({ tableId, onBack, title }: any) {
    const router = useRouter();
    return (
        <header className="bg-white border-b border-gray-100 h-16 px-4 flex items-center justify-between shrink-0 z-20 shadow-sm sticky top-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack || (() => router.push('/dashboard/tables'))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 transition-all active:scale-95"
                >
                    {onBack ? <ArrowLeft size={20} /> : <ChevronLeft size={20} />}
                </button>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
            </div>

            <div className="flex items-center gap-2 bg-black text-white px-4 py-1.5 rounded-full shadow-lg">
                <span className="font-bold text-sm">Mesa {tableId}</span>
            </div>
        </header>
    );
}

// DEFINICION DE VARIANTES
const HAS_VARIANTS = (p: any) => {
    const name = p.name.toLowerCase();
    return name.includes('milanesa') ||
        name.includes('hamburguesa') ||
        name.includes('pizza') ||
        name.includes('lomo') ||
        name.includes('empanada') ||
        name.includes('pasta') ||
        name.includes('sorrentinos') ||
        name.includes('ravioles') ||
        name.includes('noquis') ||
        name.includes('ñoquis') ||
        name.includes('tallarines') ||
        name.includes('spaghetti') ||
        name.includes('cinta');
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tableId = parseInt(id);
    const router = useRouter();
    const supabase = createClient();

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);

    // UI State
    const [view, setView] = useState<'CATEGORIES' | 'PRODUCTS'>('CATEGORIES');
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [orderType, setOrderType] = useState('LOCAL');
    const [loading, setLoading] = useState(true);
    const [variantProduct, setVariantProduct] = useState<any>(null);

    // INIT
    useEffect(() => {
        if (isNaN(tableId)) return;
        const init = async () => {
            const { data: cats } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
            if (cats) setCategories(cats);
            const { data: prods } = await supabase.from('products').select('*').eq('active', true);
            if (prods) setProducts(prods);
            const { data: table } = await supabase.from('salon_tables').select('*').eq('id', tableId).single();
            if (table) setOrderType(table.order_type || 'LOCAL');
            setLoading(false);
        };
        init();
    }, [tableId]);

    // FILTER LOGIC - FIXING SEARCH
    const filteredProducts = products.filter(p => {
        // Si estamos buscando, ignoramos la categoría seleccionada para buscar en todo el menú
        // O si el usuario prefiere buscar DENTRO de la categoría, descomentar la linea siguiente:
        // const matchesCategory = selectedCategory ? p.category_id === selectedCategory.id : true;

        // Comportamiento "Smart": Si hay busqueda global, muestra todo. Si no, filtra por categoria.
        if (searchQuery.length > 1) {
            return p.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return selectedCategory && p.category_id === selectedCategory.id;
    });

    // CART
    const addToCart = (product: any, variants: any[] = []) => {
        setCartItems(prev => {
            const variantKey = variants.map(v => v.name).sort().join('|');
            const cartItemId = `${product.id}-${variantKey}`;
            const extrasPrice = variants.reduce((sum, v) => sum + (v.price || 0), 0);
            const unitPrice = product.price + extrasPrice;
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { id: product.id, cartItemId, name: product.name, price: unitPrice, quantity: 1, variants }];
        });
        toast.success(`Agregado: ${product.name}`);
        setVariantProduct(null);
    };

    const handleProductClick = (product: any) => {
        if (HAS_VARIANTS(product)) {
            setVariantProduct(product); // Trigger AI/Variant Modal
        } else {
            addToCart(product);
        }
    };

    const updateQuantity = (cartItemId: string, newQty: number) => {
        if (newQty < 1) return;
        setCartItems(prev => prev.map(item => (item.cartItemId || item.id) === cartItemId ? { ...item, quantity: newQty } : item));
    };

    const removeFromCart = (cartItemId: string) => setCartItems(prev => prev.filter(item => (item.cartItemId || item.id) !== cartItemId));

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        const total = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
        await supabase.from('salon_tables').update({ status: 'OCCUPIED', total }).eq('id', tableId);
        await supabase.from('orders').insert({ table_id: tableId, total, items: cartItems, status: 'OPEN' });
        toast.success("Pedido Confirmado");
        router.push('/dashboard/tables');
    };

    // NAVIGATION HANDLERS
    const goBack = () => {
        if (searchQuery) { setSearchQuery(''); return; }
        if (view === 'PRODUCTS') {
            setView('CATEGORIES');
            setSelectedCategory(null);
        } else {
            router.push('/dashboard/tables');
        }
    };

    const selectCategory = (cat: any) => {
        setSelectedCategory(cat);
        setView('PRODUCTS');
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;

    return (
        <div className="fixed inset-0 z-[100] bg-[#F5F5F7] flex flex-col font-sans select-none overflow-hidden text-gray-900">
            <VariantSelector product={variantProduct} isOpen={!!variantProduct} onClose={() => setVariantProduct(null)} onAddToOrder={addToCart} />

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F2F2F7]">

                    <Header
                        tableId={tableId}
                        title={searchQuery ? `Resultados: "${searchQuery}"` : (selectedCategory?.name || 'Categorías')}
                        onBack={view === 'PRODUCTS' || searchQuery ? goBack : null}
                    />

                    {/* SEARCH BAR - ALWAYS VISIBLE */}
                    <div className="px-4 py-3 bg-white border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar producto (Milanesa, Agua, Café...)"
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value.length > 1) setView('PRODUCTS');
                                }}
                                className="w-full bg-gray-100 border-none rounded-xl py-3 pl-11 pr-4 text-base font-medium placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 content-start">
                        {/* VIEW: CATEGORIES GRID */}
                        {!searchQuery && view === 'CATEGORIES' && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => selectCategory(cat)}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 h-40 active:scale-95"
                                    >
                                        <span className="text-5xl drop-shadow-sm">{cat.icon}</span>
                                        <span className="font-bold text-xl text-gray-900">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* VIEW: PRODUCTS LIST */}
                        {(view === 'PRODUCTS' || searchQuery.length > 0) && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 animate-in fade-in slide-in-from-right-8 duration-300">
                                {filteredProducts.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-gray-400">
                                        <p className="text-lg">No hay productos aquí.</p>
                                        {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-500 font-bold">Borrar búsqueda</button>}
                                    </div>
                                ) : (
                                    filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className="bg-white relative rounded-2xl p-4 shadow-sm border border-gray-200 hover:border-blue-400 transition-all text-left flex flex-col h-full active:scale-95 overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 pointer-events-none">
                                                <Plus className="bg-blue-600 text-white rounded-full p-1" size={24} />
                                            </div>

                                            <div className="mb-3">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{product.name}</h3>
                                            </div>
                                            <div className="mt-auto pt-2 border-t border-gray-100 w-full flex justify-between items-center">
                                                <span className="font-black text-xl text-gray-900">${product.price}</span>
                                                {HAS_VARIANTS(product) && (
                                                    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Sparkles size={10} /> Opciones
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* RIGHT: COMPACT CART */}
                <aside className="w-[350px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 shadow-xl h-full">
                    <OrderCart
                        tableId={tableId}
                        orderType={orderType as any}
                        items={cartItems}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeFromCart}
                        onCheckout={handleCheckout}
                        onPrintTicket={() => toast.info("Imprimiendo...") as any} // Cast as any because toast.info returns string or number but void is expected here? No, toast returns ID.
                    />
                </aside>
            </div>
        </div>
    );
}
