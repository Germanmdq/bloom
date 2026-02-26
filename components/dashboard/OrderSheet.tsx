"use client";

import { useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, ArrowLeft, Trash2, CreditCard, Receipt, Send, Check, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store/order-store";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket } from "@/lib/hooks/use-pos-data";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { WebOrderList } from "@/components/pos/WebOrderList";

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
    webOrderId?: string;
};

interface ShortcutBtnProps {
    label: string;
    subLabel?: string;
    icon: ReactNode;
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
    const {
        cart, addToCart, removeFromCart, clearCart,
        getTotal, paymentMethod, setPaymentMethod, notes, setNotes,
        discount, setDiscount
    } = useOrderStore();

    const supabase = createClient();

    const { data: categories = [], isLoading: catLoading } = useCategories();
    const { data: products = [], isLoading: prodLoading } = useProducts();
    const createOrder = useCreateOrder();
    const sendKitchenTicket = useSendKitchenTicket();

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedWaiter, setSelectedWaiter] = useState<string>("");
    const [invoiceType, setInvoiceType] = useState('Factura C');
    const [clientName, setClientName] = useState('Consumidor Final');
    const [isFinishing, setIsFinishing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [extraTotal, setExtraTotal] = useState(0);
    const [productSearch, setProductSearch] = useState("");
    const [waiters, setWaiters] = useState<Array<{ id: string; full_name: string }>>([]);
    const [orderType, setOrderType] = useState<'LOCAL' | 'DELIVERY'>('LOCAL');
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [currentWebOrderId, setCurrentWebOrderId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const isWebTable = tableId === 998 || tableId === 999;

    const refreshData = async () => {
        if (isWebTable) {
            try {
                const resp = await fetch('/api/orders/list');
                const res = await resp.json();
                if (res.data) {
                    setWebOrders(res.data.filter((o: any) => o.table_id === tableId));
                }
            } catch (e) {
                console.error("Error loading web orders:", e);
            }
        } else {
            const { data: tableData } = await supabase
                .from('salon_tables')
                .select('total, order_type')
                .eq('id', tableId)
                .single();
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

    useEffect(() => {
        const init = async () => {
            const { data: waiterData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'WAITER');
            if (waiterData) {
                setWaiters(waiterData);
                if (waiterData.length > 0) setSelectedWaiter(waiterData[0].id);
            }

            if (webOrderId) {
                const resp = await fetch('/api/orders/list');
                const res = await resp.json();
                if (res.data) {
                    const order = res.data.find((o: any) => o.id === webOrderId);
                    if (order) handleSelectWebOrder(order);
                }
            } else {
                await refreshData();
            }
        };
        init();
    }, [tableId, webOrderId]);

    const persistTableState = async () => {
        if (cart.length === 0 && extraTotal === 0) return;
        const currentTotal = useOrderStore.getState().getTotal() + extraTotal;
        try {
            await supabase
                .from('salon_tables')
                .update({ status: 'OCCUPIED', total: currentTotal })
                .eq('id', tableId);
        } catch (err) {
            console.error("Failed to sync table:", err);
        }
    };

    useEffect(() => {
        const timer = setTimeout(persistTableState, 1000);
        return () => clearTimeout(timer);
    }, [cart, extraTotal, tableId]);

    const handleClose = async () => {
        await persistTableState();
        onClose();
    };

    const subtotal = useOrderStore(state => state.getTotal());
    const total = subtotal + extraTotal;
    const finalTotal = total - (total * (discount / 100));
    const isLoading = catLoading || prodLoading;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.startsWith('F')) e.preventDefault();
            switch (e.key) {
                case 'F1': sendToKitchen(); break;
                case 'F2': setShowReceiptModal(true); break;
                case 'F3': document.getElementById('product-search')?.focus(); break;
                case 'F4': document.getElementById('waiter-selector')?.focus(); break;
                case 'F5': handleClose(); break;
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

    const finishOrder = async () => {
        if (finalTotal === 0 && discount === 0) return;
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
            if (currentWebOrderId) {
                await fetch(`/api/orders/delete?id=${currentWebOrderId}`, { method: 'DELETE' });
            }
            setFeedback({ message: "¡Venta registrada exitosamente!", type: 'success' });
            setTimeout(() => {
                setFeedback(null);
                clearCart();
                if (isWebTable) {
                    setCurrentWebOrderId(null);
                    refreshData();
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

    if (isWebTable && !currentWebOrderId) {
        return (
            <WebOrderList
                tableId={tableId}
                webOrders={webOrders}
                onSelectOrder={handleSelectWebOrder}
                onClose={onClose}
            />
        );
    }

    const displayProducts = productSearch
        ? products.filter((p: any) => {
            const term = productSearch.toLowerCase().trim();
            return p.name.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term) ||
                categories.find((c: any) => c.id === p.category_id)?.name.toLowerCase().includes(term);
        })
        : activeCategory
            ? products.filter((p: any) => p.category_id === activeCategory)
            : products;

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E]">
            {/* HEADER */}
            <div className="bg-[#FFD60A] pt-3 pb-4 px-6 flex flex-col gap-4 border-b border-black/5 shadow-md shrink-0">
                <div className="flex items-center justify-between w-full border-b border-black/5 pb-3">
                    <div className="flex items-center gap-3">
                        {isWebTable && currentWebOrderId && (
                            <button
                                onClick={handleBackToWebList}
                                className="w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-lg shadow-sm">
                            {tableId === 998 ? 'R' : tableId === 999 ? 'E' : tableId}
                        </div>
                        <span className="font-black text-black uppercase tracking-tighter text-2xl">
                            {tableId === 998 ? "Retiro" : tableId === 999 ? "Envío" : `Mesa ${tableId}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex bg-black/5 rounded-full p-1">
                            <button
                                onClick={() => setOrderType('LOCAL')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${orderType === 'LOCAL' ? 'bg-black text-[#FFD60A]' : 'text-black/50 hover:bg-black/5'}`}
                            >
                                Local
                            </button>
                            <button
                                onClick={() => setOrderType('DELIVERY')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${orderType === 'DELIVERY' ? 'bg-black text-[#FFD60A]' : 'text-black/50 hover:bg-black/5'}`}
                            >
                                Delivery
                            </button>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-black/40 uppercase mb-0.5">Estado Venta</p>
                            <span className="bg-[#E5C209] text-black/80 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-black/5">Abierta</span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-xl bg-black/10 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black uppercase mb-1 ml-1">Comprobante</span>
                            <select
                                value={invoiceType}
                                onChange={(e) => setInvoiceType(e.target.value)}
                                className="bg-white/50 hover:bg-white border-2 border-black/10 rounded-lg px-3 py-2 text-sm font-black w-32 outline-none"
                            >
                                <option>Factura C</option>
                                <option>Factura B</option>
                                <option>Ticket</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-black uppercase mb-1 ml-1">Mozo (F4)</span>
                            <select
                                id="waiter-selector"
                                value={selectedWaiter}
                                onChange={(e) => setSelectedWaiter(e.target.value)}
                                className="bg-white/50 hover:bg-white border-2 border-black/10 rounded-lg px-3 py-2 text-sm font-black w-40 outline-none"
                            >
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
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: CART */}
                <div className="w-[33%] flex flex-col bg-white border-r border-black/5">
                    <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 p-4 bg-gray-100 border-b border-black/10 text-[10px] font-black text-black uppercase tracking-widest">
                        <div>Producto</div>
                        <div className="text-right">Precio</div>
                        <div className="text-right">Cant</div>
                        <div className="text-right">Total</div>
                        <div className="text-right"></div>
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
                                <div className="text-right">
                                    <button onClick={() => removeFromCart(idx)}>
                                        <Trash2 size={14} className="text-red-500 hover:text-red-700 hover:scale-110" />
                                    </button>
                                </div>
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
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Subtotal</span>
                            <span className="font-bold">${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Total</p>
                                <p className="text-4xl font-black tracking-tighter text-[#FFD60A]">${total.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="h-14 px-6 rounded-2xl bg-[#FFD60A] text-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-lg flex-1 justify-center"
                            >
                                <CreditCard size={20} />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[9px] font-black uppercase opacity-60">F12</span>
                                    <span className="text-sm font-bold">Cobrar</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: PRODUCTS */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                        {(!activeCategory && !productSearch) ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                {categories.map((cat: any) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className="h-28 flex flex-col items-center justify-center p-2 rounded-2xl bg-white border-2 border-transparent hover:border-black/5 hover:shadow-xl transition-all group active:scale-95 gap-1"
                                    >
                                        <h3 className="font-black text-[10px] text-center uppercase tracking-tight text-gray-900 group-hover:text-black leading-tight px-1">
                                            {cat.name}
                                        </h3>
                                        <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                            {products.filter((p: any) => p.category_id === cat.id).length} Prods.
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
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
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price), quantity: 1 })}
                                        className="aspect-[4/3] flex flex-col items-center justify-between p-3 rounded-2xl bg-white border-2 border-transparent hover:border-black shadow-sm hover:shadow-lg transition-all group active:scale-95"
                                    >
                                        <div className="flex-1 flex items-center justify-center w-full">
                                            <h4 className="font-bold text-gray-900 text-xs text-center leading-tight line-clamp-2 group-hover:scale-105 transition-transform">{item.name}</h4>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 group-hover:text-black transition-colors bg-gray-50 px-2 py-0.5 rounded-md mt-1">
                                            ${Number(item.price).toLocaleString()}
                                        </p>
                                    </button>
                                ))}
                                {displayProducts.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        No hay productos en esta categoría
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showReceiptModal && (
                <ReceiptModal
                    tableId={tableId}
                    invoiceType={invoiceType}
                    extraTotal={extraTotal}
                    cart={cart}
                    total={total}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    tableId={tableId}
                    total={total}
                    finalTotal={finalTotal}
                    discount={discount}
                    setDiscount={setDiscount}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    cart={cart}
                    isFinishing={isFinishing}
                    onClose={() => setShowPaymentModal(false)}
                    onConfirm={finishOrder}
                />
            )}

            {/* FEEDBACK POPUP */}
            <AnimatePresence>
                {feedback && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            className={`pointer-events-auto px-10 py-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border text-center ${feedback.type === 'success' ? 'bg-black text-[#FFD60A] border-[#FFD60A]/20' : 'bg-white text-red-500 border-red-100'}`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${feedback.type === 'success' ? 'bg-[#FFD60A] text-black' : 'bg-red-50 text-red-500'}`}>
                                {feedback.type === 'success' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight max-w-[200px] leading-tight flex-1 flex items-center justify-center">
                                {feedback.message}
                            </h3>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
