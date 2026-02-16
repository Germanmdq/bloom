"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, ChevronRight, Store, Truck, MapPin, User, Phone, Check, Info, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

// Types
interface ProductOption {
    name: string;
    values: string[];
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_id: string;
    options?: ProductOption[] | null; // JSONB from DB
    categories?: {
        name: string;
    };
}

interface Category {
    id: string;
    name: string;
}

interface CartItem extends Product {
    cartItemId: string; // Unique ID for cart item (product + options)
    quantity: number;
    selectedOptions?: Record<string, string>;
    notes?: string;
}

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Customization State
    const [productToCustomize, setProductToCustomize] = useState<Product | null>(null);
    const [currentOptions, setCurrentOptions] = useState<Record<string, string>>({});

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
    const handleAddToCartClick = (product: Product) => {
        if (product.options && product.options.length > 0) {
            // Open customization modal
            const initialOptions: Record<string, string> = {};
            product.options.forEach(opt => {
                if (opt.values.length > 0) initialOptions[opt.name] = opt.values[0];
            });
            setCurrentOptions(initialOptions);
            setProductToCustomize(product);
        } else {
            addToCart(product);
        }
    };

    const confirmCustomization = () => {
        if (!productToCustomize) return;
        addToCart(productToCustomize, currentOptions);
        setProductToCustomize(null);
        setCurrentOptions({});
        toast.success("Agregado con opciones");
    };

    const addToCart = (product: Product, options?: Record<string, string>) => {
        const optionsKey = options ? JSON.stringify(options) : "";
        const cartItemId = `${product.id}-${optionsKey}`;

        setCart(prev => {
            const existingItem = prev.find(item => item.cartItemId === cartItemId);
            if (existingItem) {
                return prev.map(item =>
                    item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1, selectedOptions: options, cartItemId }];
        });

        if (!productToCustomize) toast.success("Agregado al carrito");
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.cartItemId === cartItemId) {
                    const newQty = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const filteredProducts = selectedCategory === "all"
        ? products
        : products.filter(p => p.categories?.name === selectedCategory || p.category_id === selectedCategory);

    const activeCategories = categories.filter(cat =>
        products.some(p => p.categories?.name === cat.name || p.category_id === cat.id)
    );

    const getProductQuantity = (productId: string) => {
        // Only shows total qty of that product ID regardless of options
        return cart.filter(item => item.id === productId).reduce((acc, item) => acc + item.quantity, 0);
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return;
        setIsSubmitting(true);

        const orderItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            options: item.selectedOptions // Backend should handle this field or store in JSON
        }));

        // Flatten options into name for simple backend compatibility if needed
        const flattenedItems = orderItems.map(item => ({
            ...item,
            name: item.options ? `${item.name} (${Object.values(item.options).join(', ')})` : item.name
        }));

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

        const finalItems = [...flattenedItems, customerMetaItem];

        try {
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
                alert(`Error al crear pedido: ${result.error}`);
                setIsSubmitting(false);
                return;
            }

            if (paymentMethod === 'MERCADO_PAGO') {
                try {
                    const mpResponse = await fetch('/api/mercadopago/preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: cart, // Envío cart original, backend MP debe procesar nombre
                            payer: checkoutForm
                        })
                    });
                    const mpResult = await mpResponse.json();

                    if (!mpResponse.ok) throw new Error(mpResult.error || "Error de pago");

                    if (mpResult.init_point) {
                        window.location.href = mpResult.init_point;
                        return;
                    } else {
                        throw new Error("No se recibió link de pago");
                    }
                } catch (mpError: any) {
                    alert(`Error Mercado Pago: ${mpError.message}`);
                    setIsSubmitting(false);
                }
            } else {
                setStep("success");
                setCart([]);
                setIsSubmitting(false);
            }
        } catch (err) {
            alert("Error de conexión.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-crema font-sans pb-32 text-piedra">
            {/* HEADER */}
            <header className="fixed top-0 inset-x-0 bg-crema/90 backdrop-blur-md z-40 border-b border-chocolate/5">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="font-sans text-2xl font-black tracking-widest text-piedra hover:scale-105 transition-transform">
                            BLOOM
                        </Link>
                        <nav className="hidden md:flex gap-6">
                            <Link href="/about" className="text-xs font-bold tracking-widest text-gris hover:text-chocolate transition-colors uppercase">Nosotros</Link>
                            <Link href="/dashboard" className="text-xs font-bold tracking-widest text-gris hover:text-chocolate transition-colors uppercase">Acceso</Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/about" className="md:hidden text-gris hover:text-chocolate transition-colors"><Info size={24} /></Link>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-3 hover:bg-chocolate/10 rounded-full transition-colors group"
                        >
                            <ShoppingBag className="text-piedra group-hover:text-chocolate transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute top-0 right-0 bg-chocolate text-crema text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO BANNER */}
            <div className="pt-20 pb-8 px-4">
                <div className="relative h-[30vh] md:h-[40vh] bg-piedra rounded-[2.5rem] overflow-hidden shadow-2xl shadow-chocolate/20">
                    <Image
                        src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2574&auto=format&fit=crop"
                        alt="Menu Hero"
                        fill
                        className="object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-piedra via-piedra/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-8 md:p-12">
                        <p className="text-crema/80 font-bold tracking-widest uppercase text-xs mb-2">Pedidos Online</p>
                        <h1 className="text-4xl md:text-6xl font-black text-crema mb-2 tracking-tighter uppercase leading-none">Nuestro Menú</h1>
                        <p className="text-crema/90 font-medium max-w-md text-sm md:text-base">Elegí tus favoritos y recibilos en tu mesa o en tu casa.</p>
                    </div>
                </div>
            </div>

            {/* COFFEE GALLERY */}
            <div className="container mx-auto px-4 mb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md group">
                        <Image
                            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800"
                            alt="Ambiente Cafe"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-chocolate/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md group md:col-span-2">
                        <Image
                            src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200"
                            alt="Latte Art Social"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute bottom-4 left-4 bg-crema/90 px-4 py-2 rounded-xl backdrop-blur-md">
                            <span className="text-piedra font-black text-xs uppercase tracking-widest">Especialidad</span>
                        </div>
                    </div>
                    <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md group">
                        <Image
                            src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800"
                            alt="Espresso"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-piedra/10 group-hover:bg-transparent transition-colors" />
                    </div>
                </div>
            </div>

            {/* CATEGORIES */}
            <div className="sticky top-20 z-30 bg-crema/95 backdrop-blur-sm py-4 border-b border-chocolate/5 mb-8">
                <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 md:gap-3 md:justify-center min-w-max px-2">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all transform active:scale-95 border ${selectedCategory === "all"
                                ? "bg-piedra text-crema border-piedra shadow-lg shadow-piedra/20"
                                : "bg-white text-gris border-transparent hover:border-chocolate/20 hover:text-chocolate"
                                }`}
                        >
                            Todos
                        </button>

                        {activeCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all transform active:scale-95 border ${selectedCategory === cat.name
                                    ? "bg-chocolate text-crema border-chocolate shadow-lg shadow-chocolate/20"
                                    : "bg-white text-gris border-transparent hover:border-chocolate/20 hover:text-chocolate"
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PRODUCT GRID */}
            <main className="container mx-auto px-4 pb-32">
                {loading ? (
                    <div className="flex justify-center py-20 text-chocolate">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-chocolate"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => {
                            const hasOptions = product.options && product.options.length > 0;

                            return (
                                <div key={product.id} className="group bg-white rounded-[2rem] p-3 shadow-md hover:shadow-2xl hover:shadow-chocolate/10 transition-all duration-300 border border-transparent hover:border-chocolate/10 hover:-translate-y-1">
                                    <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-gray-100 mb-4">
                                        {product.image_url ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                <Store size={32} />
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 right-2 bg-crema/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm">
                                            <span className="font-black text-lg text-piedra">${product.price}</span>
                                        </div>
                                    </div>

                                    <div className="px-2 pb-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-piedra text-lg leading-tight mb-1">{product.name}</h3>
                                            {hasOptions && <span className="px-2 py-0.5 bg-chocolate/10 text-chocolate text-[10px] font-bold uppercase rounded-md">Opciones</span>}
                                        </div>
                                        <p className="text-xs text-gris line-clamp-2 mb-6 min-h-[2.5em]">{product.description}</p>

                                        <button
                                            onClick={() => handleAddToCartClick(product)}
                                            className="w-full bg-piedra text-crema py-3.5 rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-chocolate transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-chocolate/20"
                                        >
                                            <span>Agregar</span>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* CUSTOMIZATION MODAL */}
            <AnimatePresence>
                {productToCustomize && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProductToCustomize(null)} className="absolute inset-0 bg-piedra/80 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 bg-chocolate text-crema text-center relative">
                                <h3 className="font-black text-xl uppercase leading-none">{productToCustomize.name}</h3>
                                <p className="text-sm opacity-80 mt-1">Personaliza tu pedido</p>
                                <button onClick={() => setProductToCustomize(null)} className="absolute top-4 right-4 text-crema/60 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                {productToCustomize.options?.map(opt => (
                                    <div key={opt.name}>
                                        <h4 className="font-bold text-piedra text-sm uppercase tracking-widest mb-3">{opt.name}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {opt.values.map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => setCurrentOptions(prev => ({ ...prev, [opt.name]: val }))}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${currentOptions[opt.name] === val
                                                            ? "border-chocolate bg-chocolate text-crema shadow-lg"
                                                            : "border-gray-100 text-gris hover:border-chocolate/30"
                                                        }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={confirmCustomization}
                                    className="w-full bg-piedra text-crema py-4 rounded-xl font-black uppercase tracking-widest hover:bg-chocolate transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>Confirmar</span>
                                    <Check size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CART DRAWER */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-piedra/60 backdrop-blur-sm" />

                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="relative bg-crema w-full max-w-md h-full shadow-2xl flex flex-col border-l border-white/20"
                        >
                            <div className="p-6 border-b border-chocolate/5 flex items-center justify-between bg-white/50 shrink-0">
                                <h2 className="font-black text-xl tracking-tight text-piedra uppercase">Tu Pedido</h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-chocolate/10 rounded-full text-gris hover:text-chocolate transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                                {step === "cart" && (
                                    <>
                                        {cart.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-gris/40">
                                                <ShoppingBag size={64} className="mb-4 opacity-20" />
                                                <p className="font-bold uppercase tracking-widest text-xs">Tu carrito está vacío</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {cart.map(item => (
                                                    <div key={item.cartItemId} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-transparent hover:border-chocolate/10 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-piedra text-sm uppercase leading-tight">{item.name}</h4>
                                                                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-300 hover:text-red-400 p-1"><X size={14} /></button>
                                                            </div>
                                                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {Object.values(item.selectedOptions).map(val => (
                                                                        <span key={val} className="text-[10px] bg-gray-100 text-gris px-1.5 py-0.5 rounded-md font-bold">{val}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <p className="text-xs font-bold text-chocolate mt-2">${item.price}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-crema rounded-lg p-1 border border-chocolate/5">
                                                            <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-piedra hover:text-chocolate"><Minus size={12} /></button>
                                                            <span className="text-xs font-black w-4 text-center text-piedra">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-piedra hover:text-chocolate"><Plus size={12} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ... Checkout Form Reuse (Same as before) ... */}
                                {step === "checkout" && (
                                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${orderType === 'pickup' ? 'border-chocolate bg-chocolate/5' : 'border-transparent bg-white'}`}>
                                                <input type="radio" name="type" className="hidden" checked={orderType === 'pickup'} onChange={() => setOrderType('pickup')} />
                                                <Store size={24} className={orderType === 'pickup' ? 'text-chocolate' : 'text-gris'} />
                                                <span className="font-bold text-sm text-piedra">Retiro</span>
                                            </label>
                                            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${orderType === 'delivery' ? 'border-chocolate bg-chocolate/5' : 'border-transparent bg-white'}`}>
                                                <input type="radio" name="type" className="hidden" checked={orderType === 'delivery'} onChange={() => setOrderType('delivery')} />
                                                <Truck size={24} className={orderType === 'delivery' ? 'text-chocolate' : 'text-gris'} />
                                                <span className="font-bold text-sm text-piedra">Envío</span>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <input required type="text" className="w-full bg-white border-0 rounded-xl px-4 py-4 font-bold text-piedra placeholder:text-gris/50 focus:ring-2 ring-chocolate/20 outline-none" placeholder="Tu Nombre" value={checkoutForm.name} onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })} />
                                            <input required type="tel" className="w-full bg-white border-0 rounded-xl px-4 py-4 font-bold text-piedra placeholder:text-gris/50 focus:ring-2 ring-chocolate/20 outline-none" placeholder="WhatsApp / Teléfono" value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} />
                                            {orderType === 'delivery' && (
                                                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} required type="text" className="w-full bg-white border-0 rounded-xl px-4 py-4 font-bold text-piedra placeholder:text-gris/50 focus:ring-2 ring-chocolate/20 outline-none" placeholder="Dirección de Entrega" value={checkoutForm.address} onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })} />
                                            )}
                                            <textarea className="w-full bg-white border-0 rounded-xl px-4 py-4 font-bold text-piedra placeholder:text-gris/50 focus:ring-2 ring-chocolate/20 outline-none resize-none" rows={2} placeholder="Notas adicionales..." value={checkoutForm.notes} onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} />
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <h3 className="text-xs font-bold text-gris uppercase tracking-widest mb-2">Pago</h3>
                                            <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 bg-white transition-all hover:bg-white/80 ${paymentMethod === 'MERCADO_PAGO' ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-50' : 'border-transparent'}`}>
                                                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'MERCADO_PAGO'} onChange={() => setPaymentMethod('MERCADO_PAGO')} />
                                                <div className="flex-1"><span className="font-bold text-piedra block">Mercado Pago</span><span className="text-xs text-gris">Tarjetas, Dinero en cuenta</span></div>
                                                <span className="text-sky-500 font-black text-sm">MP</span>
                                            </label>
                                            <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 bg-white transition-all hover:bg-white/80 ${paymentMethod === 'CASH' ? 'border-chocolate ring-1 ring-chocolate bg-chocolate/5' : 'border-transparent'}`}>
                                                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} />
                                                <div className="flex-1"><span className="font-bold text-piedra block">{orderType === 'pickup' ? 'Pagar al Retirar' : 'Pagar al Recibir'}</span><span className="text-xs text-gris">Efectivo / Débito</span></div>
                                                <Store size={20} className="text-chocolate" />
                                            </label>
                                        </div>
                                    </form>
                                )}

                                {step === "success" && (
                                    <div className="flex flex-col items-center justify-center text-center h-full py-10">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"><Check size={40} strokeWidth={4} /></div>
                                        <h3 className="text-2xl font-black text-piedra mb-2 uppercase">¡Pedido Recibido!</h3>
                                        <p className="text-gris text-sm font-medium leading-relaxed max-w-xs mx-auto mb-8">Ya estamos preparando tu pedido. Te avisaremos cualquier novedad.</p>
                                        <button onClick={() => { setIsCartOpen(false); setStep("cart"); setCheckoutForm({ name: "", phone: "", address: "", notes: "" }); }} className="bg-piedra text-crema px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-chocolate transition-colors">Volver al Menú</button>
                                    </div>
                                )}
                            </div>

                            {/* Footer (Same as before) */}
                            {step !== "success" && (
                                <div className="p-6 bg-white/50 border-t border-chocolate/5 shrink-0 backdrop-blur-md">
                                    <div className="flex justify-between items-end mb-6">
                                        <span className="text-gris text-xs font-bold uppercase tracking-widest">Total Estimado</span>
                                        <span className="text-4xl font-black text-piedra tracking-tighter">${cartTotal.toLocaleString()}</span>
                                    </div>

                                    {step === "cart" ? (
                                        <button onClick={() => setStep("checkout")} disabled={cart.length === 0} className="w-full bg-piedra text-crema py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-chocolate transition-colors shadow-lg shadow-piedra/20 disabled:opacity-50">
                                            <span>Continuar Compra</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button onClick={() => setStep("cart")} className="px-6 py-5 rounded-2xl font-bold text-gris hover:bg-white transition-colors">Atrás</button>
                                            <button form="checkout-form" type="submit" disabled={isSubmitting} className="flex-1 bg-chocolate text-crema py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-chocolate/30">
                                                {isSubmitting ? <span>Procesando...</span> : <span>Confirmar Pedido</span>}
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
