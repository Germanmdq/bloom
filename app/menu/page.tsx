"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, ChevronRight, Store, Truck, MapPin, User, Phone, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner"; // Assuming you have sonner or some toast lib installed from package.json

// Types
interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_id: string;
    categories?: {
        name: string;
    };
}

interface Category {
    id: string;
    name: string;
}

interface CartItem extends Product {
    quantity: number;
    notes?: string;
}

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Checkout State
    const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
    const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
    const [checkoutForm, setCheckoutForm] = useState({
        name: "",
        phone: "",
        address: "",
        notes: ""
    });
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MERCADO_PAGO'>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*, categories(name)');

        if (catData) setCategories(catData);
        if (prodData) setProducts(prodData);
        setLoading(false);
    }

    // Cart Functions
    // Cart Functions
    const addToCart = (product: Product) => {
        console.log("Adding to cart:", product.name);
        setCart(prev => {
            const existingParams = prev.find(item => item.id === product.id);
            if (existingParams) {
                console.log("Updating existing item");
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            console.log("Adding new item");
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === productId) {
                    const newQty = Math.max(0, item.quantity + delta);
                    // If quantity goes to 0 here, we might want to remove it, or keep it as 0? 
                    // Usually better to remove it if it hits 0 in the cart view, 
                    // but from the card view (-, +) hitting 0 means removing from cart.
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0); // Remove items with 0 quantity
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const filteredProducts = selectedCategory === "all"
        ? products
        : products.filter(p => p.categories?.name === selectedCategory || p.category_id === selectedCategory);

    // Use category names for filtering if possible, or IDs
    const uniqueCategories = Array.from(new Set(categories.map(c => c.name)));

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return;
        setIsSubmitting(true);

        const orderItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
        }));

        // Add customer info as a metadata item (safe way via JSON)
        const customerMetaItem = {
            is_meta: true,
            name: `Cliente: ${checkoutForm.name}`,
            quantity: 1,
            price: 0,
            details: {
                phone: checkoutForm.phone,
                address: checkoutForm.address,
                type: orderType,
                notes: checkoutForm.notes
            }
        };

        const finalItems = [...orderItems, customerMetaItem];

        try {
            // Use our server-side API route instead of direct client call
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    total: cartTotal,
                    table_id: orderType === 'pickup' ? 998 : 999,
                    payment_method: paymentMethod,
                    items: finalItems
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("API Error:", result.error);
                alert(`Error al crear pedido: ${result.error}`);
                setIsSubmitting(false);
                return;
            }

            console.log("Order created:", result.data);

            if (paymentMethod === 'MERCADO_PAGO') {
                // Redirect to Mercado Pago
                try {
                    const mpResponse = await fetch('/api/mercadopago/preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: cart,
                            payer: checkoutForm
                        })
                    });
                    const mpResult = await mpResponse.json();

                    if (!mpResponse.ok) {
                        throw new Error(mpResult.error || "Error al conectar con el servidor de pagos");
                    }

                    if (mpResult.init_point) {
                        window.location.href = mpResult.init_point;
                        return; // Wait for redirect
                    } else {
                        throw new Error("No se recibió link de pago");
                    }
                } catch (mpError: any) {
                    console.error("Mercado Pago Error:", mpError);
                    alert(`Error Mercado Pago: ${mpError.message}`);
                    setIsSubmitting(false);
                }
            } else {
                // Offline Payment
                setStep("success");
                setCart([]);
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            alert("Error de conexión al procesar el pedido.");
            setIsSubmitting(false);
        }
    };

    // Filter categories to only those that have products
    const activeCategories = categories.filter(cat =>
        products.some(p => p.categories?.name === cat.name || p.category_id === cat.id)
    );

    const getProductQuantity = (productId: string) => {
        return cart.find(item => item.id === productId)?.quantity || 0;
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans pb-32">
            {/* HEADER */}
            <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-raleway text-2xl font-black tracking-widest text-black">
                        BLOOM
                    </Link>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ShoppingBag className="text-black" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#FFD60A] text-black text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* HERO BANNER */}
            <div className="relative h-[40vh] bg-black overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2574&auto=format&fit=crop"
                    alt="Menu Hero"
                    fill
                    className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FA] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-8">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-2 tracking-tighter">NUESTRO MENÚ</h1>
                    <p className="text-gray-600 font-medium max-w-md">Elegí tus favoritos y recibilos en tu mesa o en tu casa.</p>
                </div>
            </div>

            {/* CATEGORIES - CLEAN PILLS */}
            <div className="sticky top-16 z-30 bg-[#F8F9FA]/95 backdrop-blur-sm py-6 border-b border-gray-200/50 mb-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all transform active:scale-95 ${selectedCategory === "all"
                                ? "bg-black text-white shadow-lg shadow-black/20"
                                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100"
                                }`}
                        >
                            Todos
                        </button>

                        {activeCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all transform active:scale-95 ${selectedCategory === cat.name
                                    ? "bg-black text-white shadow-lg shadow-black/20"
                                    : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100"
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PRODUCT GRID - E-COMMERCE STYLE */}
            <main className="container mx-auto px-4 pb-32">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                        {filteredProducts.map(product => {
                            const qty = getProductQuantity(product.id);

                            return (
                                <div key={product.id} className="group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-50 hover:-translate-y-1">
                                    {/* Image Container */}
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-4">
                                        {product.image_url ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                <Store size={32} />
                                            </div>
                                        )}
                                        {/* Floating Price Tag */}
                                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm">
                                            <span className="font-black text-lg text-gray-900">${product.price}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="px-2 pb-2">
                                        <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{product.description}</p>

                                        {qty === 0 ? (
                                            <button
                                                onClick={() => {
                                                    addToCart(product);
                                                    // Don't open cart automatically, allows adding more
                                                }}
                                                className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-[#FFD60A] hover:text-black transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-black/10"
                                            >
                                                <span>AGREGAR</span>
                                                <Plus size={16} />
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-between bg-black text-white rounded-xl p-1">
                                                <button
                                                    onClick={() => updateQuantity(product.id, -1)}
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 rounded-lg transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="font-black text-lg">{qty}</span>
                                                <button
                                                    onClick={() => updateQuantity(product.id, 1)}
                                                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 rounded-lg transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* CART MODAL / DRAWER */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm bg-black/20">
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
                        >
                            {/* Cart Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                <h2 className="font-black text-xl tracking-tight">Tu Pedido</h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Cart Steps */}
                            <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-6">
                                {step === "cart" && (
                                    <>
                                        {cart.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                                <ShoppingBag size={48} className="mb-4 opacity-20" />
                                                <p>Tu carrito está vacío</p>
                                                <button onClick={() => setIsCartOpen(false)} className="mt-4 text-black text-sm font-bold underline">
                                                    Volver al menú
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {cart.map(item => (
                                                    <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-900">{item.name}</h4>
                                                            <p className="text-sm font-semibold text-gray-500">${item.price}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-black">
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-black">
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {step === "checkout" && (
                                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                                        {/* Order Type */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${orderType === 'pickup' ? 'border-[#FFD60A] bg-[#FFD60A]/5' : 'border-gray-100 bg-white'}`}>
                                                <input type="radio" name="type" className="hidden" checked={orderType === 'pickup'} onChange={() => setOrderType('pickup')} />
                                                <Store size={24} className={orderType === 'pickup' ? 'text-black' : 'text-gray-400'} />
                                                <span className="font-bold text-sm">Retiro</span>
                                            </label>
                                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${orderType === 'delivery' ? 'border-[#FFD60A] bg-[#FFD60A]/5' : 'border-gray-100 bg-white'}`}>
                                                <input type="radio" name="type" className="hidden" checked={orderType === 'delivery'} onChange={() => setOrderType('delivery')} />
                                                <Truck size={24} className={orderType === 'delivery' ? 'text-black' : 'text-gray-400'} />
                                                <span className="font-bold text-sm">Envío</span>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tu Nombre</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                                    <input
                                                        required
                                                        type="text"
                                                        className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#FFD60A] outline-none font-bold"
                                                        placeholder="Ej: Juan Pérez"
                                                        value={checkoutForm.name}
                                                        onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">WhatsApp / Teléfono</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                                    <input
                                                        required
                                                        type="tel"
                                                        className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#FFD60A] outline-none font-bold"
                                                        placeholder="Ej: 11 1234 5678"
                                                        value={checkoutForm.phone}
                                                        onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {orderType === 'delivery' && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección de Entrega</label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                                        <input
                                                            required={orderType === 'delivery'}
                                                            type="text"
                                                            className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#FFD60A] outline-none font-bold"
                                                            placeholder="Ej: Av. Libertador 1234, 4B"
                                                            value={checkoutForm.address}
                                                            onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notas (Opcional)</label>
                                                <textarea
                                                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FFD60A] outline-none font-medium resize-none"
                                                    rows={2}
                                                    placeholder="Ej: Sin cebolla, extra hielo..."
                                                    value={checkoutForm.notes}
                                                    onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                                                />
                                            </div>

                                            {/* Payment Method Selection */}
                                            <div className="space-y-3 pt-2">
                                                <h3 className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Método de Pago</h3>

                                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${paymentMethod === 'CASH' ? 'border-black bg-black/5' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                                                    <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} />
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-black' : 'border-gray-300'}`}>
                                                        {paymentMethod === 'CASH' && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-900 block">
                                                            {orderType === 'pickup' ? 'Pagar en Sucursal' : 'Pagar al Recibir'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-medium">Efectivo, Débito o Crédito</span>
                                                    </div>
                                                    <Store size={20} className="text-gray-400" />
                                                </label>

                                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${paymentMethod === 'MERCADO_PAGO' ? 'border-[#009EE3] bg-[#009EE3]/5' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                                                    <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'MERCADO_PAGO'} onChange={() => setPaymentMethod('MERCADO_PAGO')} />
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'MERCADO_PAGO' ? 'border-[#009EE3]' : 'border-gray-300'}`}>
                                                        {paymentMethod === 'MERCADO_PAGO' && <div className="w-2.5 h-2.5 rounded-full bg-[#009EE3]" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-900 block">Mercado Pago</span>
                                                        <span className="text-xs text-gray-500 font-medium">Tarjetas, Dinero en cuenta</span>
                                                    </div>
                                                    <span className="text-[#009EE3] font-black italic text-sm">MP</span>
                                                </label>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                {step === "success" && (
                                    <div className="flex flex-col items-center justify-center text-center h-full py-10">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                                            <Check size={40} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">¡Pedido Recibido!</h3>
                                        <p className="text-gray-500 max-w-xs mx-auto mb-8">
                                            Ya estamos preparando tu pedido. Te avisaremos por WhatsApp cualquier novedad.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setIsCartOpen(false);
                                                setStep("cart");
                                                setCheckoutForm({ name: "", phone: "", address: "", notes: "" });
                                            }}
                                            className="bg-black text-white px-8 py-3 rounded-xl font-bold"
                                        >
                                            Volver al Menú
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Cart Footer */}
                            {step !== "success" && (
                                <div className="p-6 bg-white border-t border-gray-100 shrink-0 safe-area-bottom">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Total</span>
                                        <span className="text-3xl font-black text-gray-900">${cartTotal.toLocaleString()}</span>
                                    </div>

                                    {step === "cart" ? (
                                        <button
                                            onClick={() => setStep("checkout")}
                                            disabled={cart.length === 0}
                                            className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                                        >
                                            <span>Continuar</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep("cart")}
                                                className="px-6 py-4 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            >
                                                Atrás
                                            </button>
                                            <button
                                                form="checkout-form"
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="flex-1 bg-[#FFD60A] text-black py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-yellow-400/20"
                                            >
                                                {isSubmitting ? (
                                                    <span>Enviando...</span>
                                                ) : (
                                                    <>
                                                        <span>Confirmar Pedido</span>
                                                        <Check size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
