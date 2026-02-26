"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { VariantSelector } from "@/components/pos/VariantSelector";
import { OrderCart } from "@/components/pos/OrderCart";
import { Search, ChevronLeft, ArrowLeft, Sparkles, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

// POS HEADER
function Header({ tableId, onBack, title }: { tableId: number; onBack: (() => void) | null; title: string }) {
    const router = useRouter();
    return (
        <header className="bg-white border-b border-gray-100 h-14 px-4 flex items-center justify-between shrink-0 z-20 shadow-sm sticky top-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack || (() => router.push('/dashboard/tables'))}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 transition-all active:scale-95"
                >
                    {onBack ? <ArrowLeft size={18} /> : <ChevronLeft size={18} />}
                </button>
                <h1 className="text-base font-bold tracking-tight text-gray-700">{title}</h1>
            </div>
            <div className="flex items-center gap-2 bg-black text-white px-4 py-1.5 rounded-full shadow-lg">
                <span className="font-bold text-sm">Mesa {tableId}</span>
            </div>
        </header>
    );
}

// HORIZONTAL CATEGORY BAR
function CategoryBar({
    categories,
    selected,
    onSelect,
}: {
    categories: any[];
    selected: any | null;
    onSelect: (cat: any | null) => void;
}) {
    return (
        <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto shrink-0 no-scrollbar">
            <button
                onClick={() => onSelect(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all ${
                    !selected
                        ? 'bg-black text-white shadow'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
                <LayoutGrid size={12} />
                Todos
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all ${
                        selected?.id === cat.id
                            ? 'bg-black text-white shadow'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    {cat.icon && <span className="text-sm">{cat.icon}</span>}
                    {cat.name}
                </button>
            ))}
        </div>
    );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tableId = parseInt(id);
    const router = useRouter();
    const supabase = createClient();

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

    // UI State
    // 'CATEGORIES' = category grid | 'PRODUCTS' = product list
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
            const [catsResult, prodsResult, tableResult] = await Promise.all([
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('products').select('*').eq('active', true),
                supabase.from('salon_tables').select('*').eq('id', tableId).single(),
            ]);

            if (catsResult.data) setCategories(catsResult.data);
            if (prodsResult.data) setProducts(prodsResult.data);

            if (tableResult.data) {
                const table = tableResult.data;
                setOrderType(table.order_type || 'LOCAL');

                // Mesa OCUPADA → cargar pedido existente y arrancar en vista de productos
                if (table.status === 'OCCUPIED') {
                    const { data: existingOrder } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('table_id', tableId)
                        .eq('status', 'OPEN')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (existingOrder) {
                        setExistingOrderId(existingOrder.id);
                        setCartItems(existingOrder.items || []);
                    }
                    // Ocupada → ir directo a productos (sin seleccionar categoría = todos)
                    setView('PRODUCTS');
                }
            }
            setLoading(false);
        };
        init();
    }, [tableId]);

    // FILTER LOGIC
    // - Si hay búsqueda → busca en todos los productos
    // - Si hay categoría seleccionada → filtra por categoría
    // - Si no hay nada → muestra TODOS los productos (en vista PRODUCTS)
    const filteredProducts = products.filter((p) => {
        if (searchQuery.length > 1) {
            return p.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        if (selectedCategory) {
            return p.category_id === selectedCategory.id;
        }
        // Sin filtro: muestra todos
        return true;
    });

    // CART HANDLERS
    const addToCart = (product: any, variants: any[] = []) => {
        setCartItems((prev) => {
            const variantKey = variants.map((v) => v.name).sort().join('|');
            const cartItemId = `${product.id}-${variantKey}`;
            const extrasPrice = variants.reduce((sum, v) => sum + (v.price || 0), 0);
            const unitPrice = product.price + extrasPrice;
            const existing = prev.find((item) => item.cartItemId === cartItemId);
            if (existing) {
                return prev.map((item) =>
                    item.cartItemId === cartItemId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { id: product.id, cartItemId, name: product.name, price: unitPrice, quantity: 1, variants }];
        });
        toast.success(`Agregado: ${product.name}`);
        setVariantProduct(null);
    };

    const handleProductClick = (product: any) => {
        if (HAS_VARIANTS(product)) {
            setVariantProduct(product);
        } else {
            addToCart(product);
        }
    };

    const updateQuantity = (cartItemId: string, newQty: number) => {
        if (newQty < 1) return;
        setCartItems((prev) =>
            prev.map((item) =>
                (item.cartItemId || item.id) === cartItemId
                    ? { ...item, quantity: newQty }
                    : item
            )
        );
    };

    const removeFromCart = (cartItemId: string) =>
        setCartItems((prev) => prev.filter((item) => (item.cartItemId || item.id) !== cartItemId));

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        const total = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
        await supabase
            .from('salon_tables')
            .update({ status: 'OCCUPIED', total, updated_at: new Date().toISOString() })
            .eq('id', tableId);
        if (existingOrderId) {
            await supabase.from('orders').update({ total, items: cartItems }).eq('id', existingOrderId);
        } else {
            await supabase.from('orders').insert({ table_id: tableId, total, items: cartItems, status: 'OPEN' });
        }
        toast.success('Pedido Confirmado');
        router.push('/dashboard/tables');
    };

    // NAVIGATION
    const goBack = () => {
        if (searchQuery) {
            setSearchQuery('');
            return;
        }
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

    // Header title
    const headerTitle = searchQuery
        ? `"${searchQuery}"`
        : selectedCategory
        ? selectedCategory.name
        : view === 'PRODUCTS'
        ? 'Todos los productos'
        : 'Categorías';

    if (loading)
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold">
                Cargando...
            </div>
        );

    return (
        <div className="fixed inset-0 z-[100] bg-[#F5F5F7] flex flex-col font-sans select-none overflow-hidden text-gray-900">
            <VariantSelector
                product={variantProduct}
                isOpen={!!variantProduct}
                onClose={() => setVariantProduct(null)}
                onAddToOrder={addToCart}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: MAIN CONTENT */}
                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F2F2F7]">
                    <Header
                        tableId={tableId}
                        title={headerTitle}
                        onBack={view === 'PRODUCTS' || searchQuery ? goBack : null}
                    />

                    {/* SEARCH BAR */}
                    <div className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
                        <div className="relative">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                size={16}
                            />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value.length > 1) setView('PRODUCTS');
                                }}
                                className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* CATEGORY BAR — visible en vista de productos */}
                    {view === 'PRODUCTS' && !searchQuery && (
                        <CategoryBar
                            categories={categories}
                            selected={selectedCategory}
                            onSelect={(cat) => setSelectedCategory(cat)}
                        />
                    )}

                    <div className="flex-1 overflow-y-auto p-4 content-start">
                        {/* VISTA: CATEGORIAS */}
                        {!searchQuery && view === 'CATEGORIES' && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => selectCategory(cat)}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 h-36 active:scale-95"
                                    >
                                        <span className="text-4xl drop-shadow-sm">{cat.icon}</span>
                                        <span className="font-bold text-lg text-gray-900">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* VISTA: PRODUCTOS */}
                        {(view === 'PRODUCTS' || searchQuery.length > 0) && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20 animate-in fade-in duration-200">
                                {filteredProducts.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-gray-400">
                                        <p className="text-lg font-bold">Sin resultados</p>
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="mt-3 text-blue-500 font-bold text-sm"
                                            >
                                                Borrar búsqueda
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className="bg-white relative rounded-2xl p-4 shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col h-full active:scale-95 overflow-hidden"
                                        >
                                            <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 mb-2">
                                                {product.name}
                                            </h3>
                                            <div className="mt-auto pt-2 border-t border-gray-100 w-full flex justify-between items-center">
                                                <span className="font-black text-xl text-gray-900">
                                                    ${product.price.toLocaleString()}
                                                </span>
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

                {/* RIGHT: CART */}
                <aside className="w-[340px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 shadow-xl h-full">
                    <OrderCart
                        tableId={tableId}
                        orderType={orderType as any}
                        items={cartItems}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeFromCart}
                        onCheckout={handleCheckout}
                        onPrintTicket={() => toast.info('Imprimiendo...') as any}
                    />
                </aside>
            </div>
        </div>
    );
}
