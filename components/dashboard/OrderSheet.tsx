"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Search, ArrowLeft, Trash2, Edit2, Plus, CreditCard, Receipt, Printer, X, LayoutGrid, User, Users, Send, Check, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useOrderStore } from "@/lib/store/order-store";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket } from "@/lib/hooks/use-pos-data";
import { getUpsellSuggestions, Suggestion } from "@/lib/ai/groq-service";

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
    webOrderId?: string;
};

interface ShortcutBtnProps {
    label: string;
    subLabel?: string;
    icon: any;
    color: string;
    onClick: () => void;
}

function ShortcutBtn({ label, subLabel, icon, color, onClick }: ShortcutBtnProps) {
    return (
        <button
            onClick={onClick}
            className={`${color} h-16 px-6 rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg group`}
        >
            <div className="scale-125">{icon}</div>
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[10px] font-black uppercase text-black/40">{subLabel}</span>
                <span className="text-lg font-bold text-black">{label}</span>
            </div>
        </button>
    );
}

export function OrderSheet({ tableId, onClose, onOrderComplete, webOrderId }: OrderSheetProps) {
    // GLOBAL STATE
    const {
        cart, addToCart, removeFromCart, updateQuantity, clearCart,
        getTotal, paymentMethod, setPaymentMethod, notes, setNotes,
        discount, setDiscount
    } = useOrderStore();

    const supabase = createClient();


    // DATA HOOKS (Cached & Optimized)
    const { data: categories = [], isLoading: catLoading } = useCategories();
    const { data: products = [], isLoading: prodLoading } = useProducts();
    const createOrder = useCreateOrder();
    const sendKitchenTicket = useSendKitchenTicket();

    // Local UI State
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedWaiter, setSelectedWaiter] = useState<string>("");
    const [invoiceType, setInvoiceType] = useState('Factura C');
    const [clientName, setClientName] = useState('Consumidor Final');
    const [isFinishing, setIsFinishing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [extraTotal, setExtraTotal] = useState(0);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [waiters, setWaiters] = useState<any[]>([]);
    const [orderType, setOrderType] = useState<'LOCAL' | 'DELIVERY'>('LOCAL');

    // Web Orders State
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [currentWebOrderId, setCurrentWebOrderId] = useState<string | null>(null);
    const isWebTable = tableId === 998 || tableId === 999;

    // Helper to refresh data
    const refreshData = async () => {
        // IF WEB TABLE (998/999), FETCH FROM API
        if (tableId === 998 || tableId === 999) {
            try {
                const resp = await fetch('/api/orders/list');
                const res = await resp.json();
                if (res.data) {
                    const filtered = res.data.filter((o: any) => o.table_id === tableId);
                    setWebOrders(filtered);
                }
            } catch (e) {
                console.error("Error loading web orders:", e);
            }
        } else {
            // REGULAR TABLE
            const { data: tableData } = await supabase.from('salon_tables').select('total, order_type').eq('id', tableId).single();
            if (tableData) {
                setExtraTotal(Number(tableData.total) || 0);
                if (tableData.order_type) setOrderType(tableData.order_type);
            }
        }
    };

    const handleSelectWebOrder = (order: any) => {
        clearCart();
        setCurrentWebOrderId(order.id);

        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                if (item.is_meta) {
                    setClientName(item.name.replace('Cliente: ', ''));
                } else {
                    addToCart({
                        id: item.id || item.product_id || 'manual-' + Math.random(),
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    });
                }
            });
        }
    };

    const handleBackToWebList = () => {
        clearCart();
        setCurrentWebOrderId(null);
        refreshData();
    };

    const loadWebOrder = async (id: string) => {
        try {
            const resp = await fetch('/api/orders/list');
            const res = await resp.json();
            if (res.data) {
                const order = res.data.find((o: any) => o.id === id);
                if (order) {
                    handleSelectWebOrder(order);
                }
            }
        } catch (e) {
            console.error("Error loading specific web order:", e);
        }
    };

    // AI Suggestions State
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Initial Fetch
    useEffect(() => {
        const initStart = async () => {
            const { data: waiterData } = await supabase.from('profiles').select('id, full_name').eq('role', 'WAITER');
            if (waiterData) {
                setWaiters(waiterData);
                if (waiterData.length > 0) setSelectedWaiter(waiterData[0].id);
            }

            if (webOrderId) {
                await loadWebOrder(webOrderId);
            } else {
                await refreshData();
            }
        };
        initStart();
    }, [tableId, webOrderId]);

    // AI Suggestions Effect (Debounced)
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (cart.length === 0) {
                setSuggestions([]);
                return;
            }
            setLoadingSuggestions(true);
            try {
                // 🔒 Pasa los productos disponibles para que la IA SOLO sugiera del menú
                const aiSuggestions = await getUpsellSuggestions(cart, products);

                // Validación defensiva
                let validSuggestions: Suggestion[] = [];
                if (Array.isArray(aiSuggestions)) {
                    validSuggestions = aiSuggestions;
                } else if (aiSuggestions && (aiSuggestions as any).suggestions) {
                    validSuggestions = (aiSuggestions as any).suggestions;
                }

                // 🔒 DOBLE VALIDACIÓN: Asegura que las sugerencias sean productos reales
                const verifiedSuggestions = validSuggestions.filter(s => {
                    const realProduct = products.find((p: any) =>
                        p.name.toLowerCase() === s.item.toLowerCase()
                    );
                    return !!realProduct;
                });

                // Hidrata con datos reales del producto
                const hydratedSuggestions = verifiedSuggestions.map(s => {
                    const realProduct = products.find((p: any) =>
                        p.name.toLowerCase() === s.item.toLowerCase()
                    );

                    return {
                        ...s,
                        item: realProduct?.name || s.item, // Nombre exacto del menú
                        price: realProduct?.price || s.price, // Precio exacto del menú
                        realProduct
                    };
                });

                console.log('✅ Verified suggestions from menu:', hydratedSuggestions);
                setSuggestions(hydratedSuggestions);
            } catch (error) {
                console.error("Groq Fetch Error:", error);
                setSuggestions([]);
            }
            setLoadingSuggestions(false);
        };

        const timer = setTimeout(fetchSuggestions, 1500); // 1.5s debounce
        return () => clearTimeout(timer);
    }, [cart, products]); // Re-run when cart changes

    useEffect(() => {
        console.log('🎨 [Render] Suggestions Updated:', suggestions);
    }, [suggestions]);

    // SYNC TABLE STATUS
    const persistTableState = async () => {
        if (cart.length === 0 && extraTotal === 0) return;

        const currentTotal = useOrderStore.getState().getTotal() + extraTotal;
        try {
            await supabase
                .from('salon_tables')
                .update({
                    status: 'OCCUPIED',
                    total: currentTotal,
                    // order_type: orderType // Disabled safely to prevent schema errors
                })
                .eq('id', tableId);
        } catch (err) {
            console.error("Failed to sync table:", err);
            // Continue execution so UI doesn't freeze
        }
    };

    useEffect(() => {
        const timer = setTimeout(persistTableState, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [cart, extraTotal, tableId, supabase, orderType]);

    const handleClose = async () => {
        await persistTableState();
        onClose();
    };

    // Replace onClose with handleClose in UI


    const subtotal = useOrderStore(state => state.getTotal());
    const total = subtotal + extraTotal;
    const finalTotal = total - (total * (discount / 100)); // Percentage Discount
    const isLoading = catLoading || prodLoading;

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.startsWith('F')) e.preventDefault();
            switch (e.key) {
                case 'F1': sendToKitchen(); break;
                case 'F2': setShowReceiptModal(true); break;
                case 'F3': document.getElementById('product-search')?.focus(); break;
                case 'F4': document.getElementById('waiter-selector')?.focus(); break; // Moved waiter here
                case 'F5': handleClose(); break;
                // F7, F11 deprecated/moved
                case 'F12':
                    if (total > 0 && !isFinishing) {
                        showPaymentModal ? finishOrder() : setShowPaymentModal(true);
                    }
                    break;
                case 'Escape':
                    if (showPaymentModal) setShowPaymentModal(false);
                    else if (showReceiptModal) setShowReceiptModal(false);
                    else handleClose();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose, total, isFinishing, showPaymentModal, showReceiptModal]);

    // MercadoPago QR
    useEffect(() => {
        if (showPaymentModal && paymentMethod === 'MERCADO_PAGO' && !qrCodeUrl) {
            generateQR();
        }
    }, [showPaymentModal, paymentMethod]);

    const generateQR = async () => {
        setIsGeneratingQR(true);
        try {
            const resp = await fetch('/api/mercadopago/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(i => ({
                        title: i.name,
                        unit_price: i.price,
                        quantity: i.quantity
                    })),
                    orderId: `table-${tableId}-${Date.now()}`
                })
            });
            const data = await resp.json();
            if (data.init_point) setQrCodeUrl(data.init_point);
        } catch (err) {
            console.error("Error generating QR:", err);
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const handleAddToCart = (product: any) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1
        });
    };

    const handleAddSuggestion = (suggestion: any) => {
        // Usa el producto real del menú, NO la sugerencia de la IA
        if (suggestion.realProduct) {
            addToCart({
                id: suggestion.realProduct.id,
                name: suggestion.realProduct.name,
                price: Number(suggestion.realProduct.price),
                quantity: 1
            });
            // console.log('✨ Usuario agregó sugerencia de IA:', suggestion.item);
        } else {
            // Fallback logic incase realProduct is missing but name/price are valid
            addToCart({
                id: 'ai-temp-' + Date.now(),
                name: suggestion.item,
                price: Number(suggestion.price),
                quantity: 1
            });
        }
    };

    const finishOrder = async () => {
        if (finalTotal === 0 && discount === 0) return; // Allow 0 total if fully discounted
        setIsFinishing(true);

        try {
            await createOrder.mutateAsync({
                table_id: tableId,
                total: finalTotal,
                payment_method: paymentMethod,
                waiter_id: selectedWaiter || null,
                items: cart
            });

            await supabase.from('salon_tables').update({ status: 'FREE', total: 0 }).eq('id', tableId);

            // DELETE Original Web Order if applicable
            if (currentWebOrderId) {
                await fetch(`/api/orders/delete?id=${currentWebOrderId}`, { method: 'DELETE' });
            }

            // SUCCESS FEEDBACK
            setFeedback({ message: "¡Venta registrada exitosamente!", type: 'success' });

            setTimeout(() => {
                setFeedback(null);
                clearCart();

                if (isWebTable) {
                    setCurrentWebOrderId(null);
                    refreshData(); // Go back to list
                } else {
                    if (onOrderComplete) onOrderComplete();
                    onClose();
                }
            }, 2000);

        } catch (error: any) {
            setFeedback({ message: `Error al guardar: ${error.message}`, type: 'error' });
            setTimeout(() => setFeedback(null), 3000);
        }

        setIsFinishing(false);
    };

    const sendToKitchen = async () => {
        if (cart.length === 0) {
            setFeedback({ message: "La comanda está vacía", type: 'error' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        setIsFinishing(true);
        try {
            await sendKitchenTicket.mutateAsync({
                table_id: String(tableId),
                items: cart.map(i => ({ name: i.name, quantity: i.quantity })),
                notes: notes
            });
            setFeedback({ message: "¡Comanda enviada a cocina!", type: 'success' });
            setTimeout(() => setFeedback(null), 2000);
        } catch (error: any) {
            setFeedback({ message: `Error: ${error.message}`, type: 'error' });
            setTimeout(() => setFeedback(null), 3000);
        }
        setIsFinishing(false);
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
                <Loader2 className="animate-spin text-black" size={40} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando Sistema POS...</p>
            </div>
        );
    }

    const displayProducts = productSearch
        ? products.filter((p: any) => {
            const term = productSearch.toLowerCase().trim();
            if (!term) return true;
            return p.name.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term) ||
                categories.find((c: any) => c.id === p.category_id)?.name.toLowerCase().includes(term);
        })
        : activeCategory
            ? products.filter((p: any) => p.category_id === activeCategory)
            : products; // If null, show ALL

    // RENDER: WEB ORDER SELECTION LIST
    if (isWebTable && !currentWebOrderId && webOrders.length > 0) {
        return (
            <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E] p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black uppercase tracking-tight">Pedidos Pendientes: {tableId === 998 ? "Retiro" : "Envío"}</h2>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/5 hover:bg-black hover:text-white transition-all flex items-center justify-center"><X /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
                    {webOrders.map((order) => {
                        const clientItem = order.items.find((i: any) => i.is_meta);
                        const clientName = clientItem ? clientItem.name : "Cliente Web";
                        const details = clientItem?.details || {};

                        return (
                            <button
                                key={order.id}
                                onClick={() => handleSelectWebOrder(order)}
                                className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col text-left group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="text-2xl font-black text-gray-900">${Number(order.total).toLocaleString()}</div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-1">{clientName.replace('Cliente: ', '')}</h3>
                                {details.phone && <p className="text-xs text-gray-400 font-bold mb-4">{details.phone}</p>}

                                <div className="flex-1 space-y-1 mb-6">
                                    {order.items.filter((i: any) => !i.is_meta).slice(0, 3).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-600">
                                            <span>{item.quantity}x {item.name}</span>
                                        </div>
                                    ))}
                                    {order.items.filter((i: any) => !i.is_meta).length > 3 && <p className="text-xs text-gray-400 italic">... y {order.items.length - 4} más</p>}
                                </div>

                                <div className="mt-auto w-full bg-[#FFD60A] text-black py-4 rounded-xl font-black text-center uppercase tracking-wider group-hover:scale-[1.02] transition-transform">
                                    Cobrar Pedido
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default render empty state for web table
    if (isWebTable && !currentWebOrderId && webOrders.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-[#F8F9FA] text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
                    <LayoutGrid size={48} />
                </div>
                <h2 className="text-2xl font-black text-gray-400 uppercase tracking-widest mb-4">No hay pedidos pendientes</h2>
                <button onClick={onClose} className="px-8 py-3 bg-black text-white rounded-xl font-bold">Volver al Salón</button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E]">
            {/* HEADER */}
            <div className="bg-[#FFD60A] pt-3 pb-4 px-6 flex flex-col gap-4 border-b border-black/5 shadow-md shrink-0">
                <div className="flex items-center justify-between w-full border-b border-black/5 pb-3">
                    <div className="flex items-center gap-3">
                        {isWebTable && currentWebOrderId && (
                            <button onClick={handleBackToWebList} className="w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white flex items-center justify-center transition-colors">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-lg shadow-sm">{tableId === 998 ? 'R' : tableId === 999 ? 'E' : tableId}</div>
                        <span className="font-black text-black uppercase tracking-tighter text-2xl">
                            {tableId === 998 ? "Retiro" : tableId === 999 ? "Envío" : `Mesa ${tableId}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex bg-black/5 rounded-full p-1">
                            <button onClick={() => setOrderType('LOCAL')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${orderType === 'LOCAL' ? 'bg-black text-[#FFD60A]' : 'text-black/50 hover:bg-black/5'}`}>Local</button>
                            <button onClick={() => setOrderType('DELIVERY')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${orderType === 'DELIVERY' ? 'bg-black text-[#FFD60A]' : 'text-black/50 hover:bg-black/5'}`}>Delivery</button>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-black/40 uppercase mb-0.5">Estado Venta</p>
                            <span className="bg-[#E5C209] text-black/80 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-black/5">Abierta</span>
                        </div>
                        <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-black/10 hover:bg-black hover:text-white transition-all flex items-center justify-center"><X size={20} /></button>
                    </div >
                </div >

                {/* CONTROLS */}
                < div className="flex items-center justify-between w-full" >
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black uppercase mb-1 ml-1">Comprobante (F7)</span>
                            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="bg-white/50 hover:bg-white border-2 border-black/10 rounded-lg px-3 py-2 text-sm font-black w-32 outline-none">
                                <option>Factura C</option><option>Factura B</option><option>Ticket</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black uppercase mb-1 ml-1">Mozo (F4)</span>
                            <select id="waiter-selector" value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)} className="bg-white/50 hover:bg-white border-2 border-black/10 rounded-lg px-3 py-2 text-sm font-black w-40 outline-none">
                                {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col flex-1 max-w-sm">
                            <span className="text-[10px] font-black text-black uppercase mb-1 ml-1">Buscador (F3)</span>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={14} strokeWidth={3} />
                                <input
                                    id="product-search"
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="BUSCAR PRODUCTO..."
                                    className="w-full bg-white/50 hover:bg-white border-2 border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm font-black outline-none focus:ring-2 ring-black/10 transition-all placeholder:text-black/50"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pl-6 border-l border-black/5">
                        <ShortcutBtn
                            subLabel="F2"
                            label="Ticket"
                            icon={<Receipt size={20} />}
                            color="bg-white/60 hover:bg-white"
                            onClick={() => setShowReceiptModal(true)}
                        />
                        <ShortcutBtn
                            subLabel="F1"
                            label="Enviar"
                            icon={<Send size={20} />}
                            color="bg-white/60 hover:bg-white"
                            onClick={sendToKitchen}
                        />
                    </div>
                </div >
            </div >

            {/* MAIN AREA */}
            < div className="flex-1 flex overflow-hidden" >
                {/* LEFT: CART */}
                < div className="w-[33%] flex flex-col bg-white border-r border-black/5" >
                    <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 p-4 bg-gray-100 border-b border-black/10 text-[10px] font-black text-black uppercase tracking-widest">
                        <div>Producto</div><div className="text-right">Precio</div><div className="text-right">Cant</div><div className="text-right">Total</div><div className="text-right"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {extraTotal > 0 && (
                            <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 px-4 py-3 border-b border-gray-50 items-center bg-orange-50/30">
                                <div className="font-bold text-sm text-gray-900">Cargos Previos</div>
                                <div className="text-right text-xs font-medium text-gray-500">-</div>
                                <div className="text-right text-xs font-medium text-gray-500">1</div>
                                <div className="text-right font-black text-gray-900">${extraTotal.toLocaleString()}</div>
                            </div>
                        )}
                        {cart.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50 text-black">
                                <div className="font-black text-sm text-black uppercase">{item.name}</div>
                                <div className="text-right text-xs font-black text-black">${item.price.toLocaleString()}</div>
                                <div className="text-right text-xs font-black text-black">{item.quantity}</div>
                                <div className="text-right font-black text-black">${(item.price * item.quantity).toLocaleString()}</div>
                                <div className="text-right"><button onClick={() => removeFromCart(idx)}><Trash2 size={14} className="text-red-500 hover:text-red-700 hover:scale-110" /></button></div>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-gray-900 text-white mt-auto">
                        <div className="flex flex-col gap-1 mb-6">
                            <label className="text-[10px] font-black uppercase text-white/40">Notas de Cocina</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-white/10 border-none rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:ring-2 ring-[#FFD60A]/50 placeholder:text-white/20"
                                placeholder="Escribe notas aquí..."
                            />
                        </div>
                        <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Subtotal</span><span className="font-bold">${subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center gap-4">
                            <div><p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Total</p><p className="text-4xl font-black tracking-tighter text-[#FFD60A]">${total.toLocaleString()}</p></div>
                            <button onClick={() => setShowPaymentModal(true)} className="h-14 px-6 rounded-2xl bg-[#FFD60A] text-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-lg flex-1 justify-center">
                                <CreditCard size={20} />
                                <div className="flex flex-col items-start leading-none"><span className="text-[9px] font-black uppercase opacity-60">F12</span><span className="text-sm font-bold">Cobrar</span></div>
                            </button>
                        </div>
                    </div>
                </div >

                {/* RIGHT: PRODUCTS */}
                < div className="flex-1 flex flex-col p-4 overflow-hidden relative" >
                    {/* TOP STRIP - CATEGORIES (Small & Scrollable) */}


                    {/* AI SUGGESTIONS */}
                    <AnimatePresence>
                        {
                            suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -20, height: 0 }}
                                    className="mb-4 overflow-hidden shrink-0"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-[#FFD60A]" fill="#FFD60A" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50">Sugerencias (IA)</h3>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                        {suggestions.map((s, idx) => (
                                            <button key={idx} onClick={() => handleAddSuggestion(s)} className="shrink-0 flex items-center gap-2 p-2 pr-4 rounded-xl bg-white border border-[#FFD60A] shadow-sm hover:bg-[#FFD60A]/10 transition-colors text-left group">
                                                <div className="w-8 h-8 rounded-full bg-[#FFD60A] flex items-center justify-center text-black font-black text-[10px] shadow-sm">+</div>
                                                <div className="max-w-[120px] truncate">
                                                    <p className="font-bold text-xs text-gray-900 leading-tight">{s.item}</p>
                                                    <p className="text-[8px] font-bold text-black opacity-40">${s.price}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )
                        }
                    </AnimatePresence >

                    {/* MAIN CONTENT AREA: Categories OR Products */}
                    <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                        {(!activeCategory && !productSearch) ? (
                            // CATEGORY GRID VIEW
                            // CATEGORY GRID VIEW
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                {categories
                                    .map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className="h-28 flex flex-col items-center justify-center p-2 rounded-2xl bg-white border-2 border-transparent hover:border-black/5 hover:shadow-xl transition-all group active:scale-95 gap-1"
                                        >

                                            <h3 className="font-black text-[10px] text-center uppercase tracking-tight text-gray-900 group-hover:text-black leading-tight px-1">
                                                {cat.name}
                                            </h3>
                                            <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{
                                                products.filter((p: any) => p.category_id === cat.id).length
                                            } Prods.</span>
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            // PRODUCT GRID VIEW
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
                                <button
                                    onClick={() => { setActiveCategory(null); setProductSearch(""); }}
                                    className="aspect-[4/3] flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-100 border-2 border-transparent hover:border-black/10 hover:bg-gray-200 transition-all group active:scale-95"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl group-hover:-translate-x-1 transition-transform shadow-sm">
                                        ⬅️
                                    </div>
                                    <h4 className="font-black text-gray-500 text-[10px] text-center uppercase mt-2 tracking-widest">VOLVER</h4>
                                </button>
                                {displayProducts.map((item: any) => (
                                    <button key={item.id} onClick={() => handleAddToCart(item)} className="aspect-[4/3] flex flex-col items-center justify-between p-3 rounded-2xl bg-white border-2 border-transparent hover:border-black shadow-sm hover:shadow-lg transition-all group active:scale-95">
                                        <div className="flex-1 flex items-center justify-center w-full">
                                            <h4 className="font-bold text-gray-900 text-xs text-center leading-tight line-clamp-2 group-hover:scale-105 transition-transform">{item.name}</h4>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 group-hover:text-black transition-colors bg-gray-50 px-2 py-0.5 rounded-md mt-1">${Number(item.price).toLocaleString()}</p>
                                    </button>
                                ))}
                                {displayProducts.length === 0 && <div className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No hay productos en esta categoría</div>}
                            </div>
                        )}
                    </div>
                </div >
            </div >

            {/* MODALS */}
            {
                showReceiptModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-20">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" onClick={() => setShowReceiptModal(false)} />
                        <div className="relative bg-white w-full max-w-[400px] rounded-sm p-8 shadow-2xl flex flex-col font-mono">
                            <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                                <h2 className="font-bold text-xl uppercase">BLOOM</h2>
                                <p className="text-xs">{new Date().toLocaleString()}</p>
                                <p className="text-xs font-bold">Mesa: {tableId} - {invoiceType}</p>
                            </div>
                            <div className="flex-1 space-y-2 mb-4 text-xs">
                                {extraTotal > 0 && <div className="grid grid-cols-[1fr_50px_50px]"><span>Cargos Previos</span><span className="text-right">1</span><span className="text-right">${extraTotal}</span></div>}
                                {cart.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_50px_50px]"><span>{item.name}</span><span className="text-right">{item.quantity}</span><span className="text-right">${item.price * item.quantity}</span></div>
                                ))}
                            </div>
                            <div className="border-t-2 border-dashed border-black pt-2 mb-8"><div className="flex justify-between font-bold text-lg"><span>TOTAL</span><span>${total.toLocaleString()}</span></div></div>
                            <div className="flex gap-2 print:hidden"><button onClick={() => window.print()} className="flex-1 py-4 bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2"><Printer size={16} /> Imprimir</button><button onClick={() => setShowReceiptModal(false)} className="px-4 py-4 bg-gray-100 rounded-lg">Cerrar</button></div>
                        </div>
                    </div>
                )
            }

            {
                showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-20">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white w-full max-w-5xl h-full max-h-[600px] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                            <div className="md:w-1/3 bg-[#FFD60A] p-10 flex flex-col justify-between relative overflow-hidden">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest opacity-40 mb-2">Total a Cobrar</h3>
                                    <p className="text-6xl font-black tracking-tighter text-black mb-8">${finalTotal.toLocaleString()}</p>
                                </div>

                                <div className="flex flex-col gap-2 bg-black/5 p-4 rounded-xl">
                                    <label className="text-[10px] font-black uppercase opacity-40">Descuento (%)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discount === 0 ? '' : discount}
                                            onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                            placeholder="0"
                                            className="w-full bg-transparent text-2xl font-black outline-none border-b-2 border-black/10 focus:border-black/50 transition-colors py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-xl font-black opacity-40">%</span>
                                    </div>
                                </div>

                                <div className="mt-8"><p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Detalles</p><div className="text-sm font-bold flex flex-col gap-1"><span>Items: {cart.length}</span></div></div>
                            </div>
                            <div className="flex-1 p-12 bg-white flex flex-col">
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Método de Pago</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button onClick={() => setPaymentMethod('CASH')} className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'CASH' ? 'border-[#FFD60A] bg-[#FFD60A]/5' : 'border-gray-100'}`}><p className="font-black text-lg">Efectivo</p></button>
                                    <button onClick={() => setPaymentMethod('MERCADO_PAGO')} className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'MERCADO_PAGO' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><p className="font-black text-lg">Mercado Pago</p></button>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-3xl p-8 flex items-center justify-center border border-gray-100 mb-4">
                                    {paymentMethod === 'CASH' && <input type="number" placeholder={total.toString()} className="text-4xl font-black text-center bg-transparent outline-none w-full" autoFocus />}
                                    {paymentMethod === 'MERCADO_PAGO' && (
                                        <div className="text-center w-full">
                                            {isGeneratingQR ? <Loader2 className="animate-spin" /> : qrCodeUrl ? <div className="flex flex-col items-center gap-6"><div className="bg-white p-6 rounded-[2rem] shadow-2xl"><QRCodeSVG value={qrCodeUrl} size={180} /></div></div> : <p className="text-red-500">Error QR</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-6 rounded-3xl bg-gray-50 text-gray-400 font-bold hover:bg-gray-100">Volver</button>
                                    <button disabled={isFinishing} onClick={finishOrder} className="flex-[2] py-6 rounded-[2rem] bg-black text-[#FFD60A] font-black hover:scale-[1.03] disabled:opacity-20 shadow-2xl">{isFinishing ? "..." : "Confirmar Venta"}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* FEEDBACK POPUP */}
            <AnimatePresence>
                {feedback && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            className={`pointer-events-auto px-10 py-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border text-center ${feedback.type === 'success' ? 'bg-black text-[#FFD60A] border-[#FFD60A]/20' : 'bg-white text-red-500 border-red-100'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${feedback.type === 'success' ? 'bg-[#FFD60A] text-black' : 'bg-red-50 text-red-500'
                                }`}>
                                {feedback.type === 'success' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight max-w-[200px] leading-tight flex-1 flex items-center justify-center">
                                {feedback.message}
                            </h3>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
