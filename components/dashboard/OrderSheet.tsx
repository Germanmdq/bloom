"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Search, ArrowLeft, Trash2, Edit2, Plus, CreditCard, Receipt, Printer, X, LayoutGrid, User, Users, Send, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useOrderStore } from "@/lib/store/order-store";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket } from "@/lib/hooks/use-pos-data";

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
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
            className={`${color} h-10 px-4 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-sm group`}
        >
            {icon}
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black uppercase text-black/50">{subLabel}</span>
                <span className="text-xs font-bold text-black">{label}</span>
            </div>
        </button>
    );
}

export function OrderSheet({ tableId, onClose, onOrderComplete }: OrderSheetProps) {
    // GLOBAL STATE
    const {
        cart, addToCart, removeFromCart, updateQuantity, clearCart,
        getTotal, paymentMethod, setPaymentMethod, notes, setNotes
    } = useOrderStore();

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
    const [waiters, setWaiters] = useState<any[]>([]); // Keep waiters local for now or optimize later

    const supabase = createClient();

    // Initial Fetch for non-cached data (Table totals, Waiters)
    useEffect(() => {
        const fetchExtras = async () => {
            const { data: waiterData } = await supabase.from('profiles').select('id, full_name').eq('role', 'WAITER');
            const { data: tableData } = await supabase.from('salon_tables').select('total').eq('id', tableId).single();
            if (waiterData) {
                setWaiters(waiterData);
                if (waiterData.length > 0) setSelectedWaiter(waiterData[0].id);
            }
            if (tableData) setExtraTotal(Number(tableData.total) || 0);
        };
        fetchExtras();
    }, [tableId]);

    const subtotal = useOrderStore(state => state.getTotal()); // Gets cart total
    const total = subtotal + extraTotal;
    const isLoading = catLoading || prodLoading;

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.startsWith('F')) e.preventDefault();
            switch (e.key) {
                case 'F1': document.getElementById('product-search')?.focus(); break;
                case 'F2': document.getElementById('client-input')?.focus(); break;
                case 'F3': document.getElementById('waiter-selector')?.focus(); break;
                case 'F4': finishOrder(); break;
                case 'F5': onClose(); break;
                case 'F7': setShowReceiptModal(true); break;
                case 'F11': sendToKitchen(); break;
                case 'F12':
                    if (total > 0 && !isFinishing) {
                        showPaymentModal ? finishOrder() : setShowPaymentModal(true);
                    }
                    break;
                case 'Escape':
                    if (showPaymentModal) setShowPaymentModal(false);
                    else if (showReceiptModal) setShowReceiptModal(false);
                    else onClose();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, total, isFinishing, showPaymentModal, showReceiptModal]);

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
                        // Use name as ID proxy if needed or ensure productId is in cart type
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
            name: product.name,
            price: Number(product.price),
            quantity: 1
        });
        // Optimistic update for table status handled by backend usually, 
        // but here we might want to sync 'OCCUPIED' status if needed. 
    };

    const finishOrder = async () => {
        if (total === 0) return;
        setIsFinishing(true);

        try {
            await createOrder.mutateAsync({
                table_id: tableId,
                total: total,
                payment_method: paymentMethod,
                waiter_id: selectedWaiter || null,
                items: cart // Store items in order history too?
            });

            // Clear table status
            await supabase.from('salon_tables').update({ status: 'FREE', total: 0 }).eq('id', tableId);

            alert(`¡Mesa cobrada exitosamente!`);
            clearCart();
            if (onOrderComplete) onOrderComplete();
            onClose();
        } catch (error: any) {
            alert(`Error al guardar: ${error.message}`);
        }
        setIsFinishing(false);
    };

    const sendToKitchen = async () => {
        if (cart.length === 0) {
            alert("⚠️ La comanda está vacía.");
            return;
        }
        setIsFinishing(true);
        try {
            await sendKitchenTicket.mutateAsync({
                table_id: String(tableId),
                items: cart.map(i => ({ name: i.name, quantity: i.quantity })),
                notes: notes
            });
            alert(`¡Comanda enviada a cocina! 👨‍🍳`);
            // clearCart(); // Dependent on workflow
        } catch (error: any) {
            alert(`Error: ${error.message}`);
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
        ? products.filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
        : products.filter((p: any) => p.category_id === activeCategory);

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E]">
            {/* HEADER */}
            <div className="bg-[#FFD60A] pt-3 pb-4 px-6 flex flex-col gap-4 border-b border-black/5 shadow-md shrink-0">
                <div className="flex items-center justify-between w-full border-b border-black/5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-lg shadow-sm">{tableId}</div>
                        <span className="font-black text-black uppercase tracking-tighter text-2xl">Mesa Bar {tableId}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-black/40 uppercase mb-0.5">Estado Venta</p>
                            <span className="bg-[#E5C209] text-black/80 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-black/5">Abierta</span>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-black/10 hover:bg-black hover:text-white transition-all flex items-center justify-center"><X size={20} /></button>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-black/40 uppercase mb-1 ml-1">Comprobante (F7)</span>
                            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="bg-white/50 hover:bg-white border-none rounded-lg px-3 py-2 text-sm font-bold w-32 outline-none">
                                <option>Factura C</option><option>Factura B</option><option>Ticket</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-black/40 uppercase mb-1 ml-1">Mozo (F3)</span>
                            <select id="waiter-selector" value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)} className="bg-white/50 hover:bg-white border-none rounded-lg px-3 py-2 text-sm font-bold w-40 outline-none">
                                {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-black/40 uppercase mb-1 ml-1">Notas</span>
                            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/50 hover:bg-white border-none rounded-lg px-3 py-2 text-sm font-bold w-56 outline-none" placeholder="..." />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pl-6 border-l border-black/5">
                        <ShortcutBtn subLabel="F1" label="Buscar" icon={<LayoutGrid size={16} />} color="bg-white/40 hover:bg-white" onClick={() => document.getElementById('product-search')?.focus()} />
                        <ShortcutBtn subLabel="F7" label="Ticket" icon={<Receipt size={16} />} color="bg-white/40 hover:bg-white" onClick={() => setShowReceiptModal(true)} />
                        <ShortcutBtn subLabel="F11" label="Enviar" icon={<Send size={16} />} color="bg-white/40 hover:bg-white" onClick={sendToKitchen} />
                        <div className="w-[1px] h-8 bg-black/10 mx-2 self-center"></div>
                        <button onClick={() => setShowPaymentModal(true)} className="h-10 px-6 rounded-full bg-black text-[#FFD60A] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-lg">
                            <CreditCard size={18} />
                            <div className="flex flex-col items-start leading-none"><span className="text-[9px] font-black uppercase opacity-60">F12</span><span className="text-xs font-bold">Cobrar</span></div>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: CART */}
                <div className="w-[33%] flex flex-col bg-white border-r border-black/5">
                    <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 p-4 bg-gray-50 border-b border-black/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
                            <div key={idx} className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50">
                                <div className="font-bold text-sm text-gray-900">{item.name}</div>
                                <div className="text-right text-xs font-medium text-gray-500">${item.price.toLocaleString()}</div>
                                <div className="text-right text-xs font-medium text-gray-500">{item.quantity}</div>
                                <div className="text-right font-black text-gray-900">${(item.price * item.quantity).toLocaleString()}</div>
                                <div className="text-right"><button onClick={() => removeFromCart(idx)}><Trash2 size={14} className="text-red-300 hover:text-red-500" /></button></div>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-gray-900 text-white mt-auto">
                        <div className="grid grid-cols-2 gap-4 mb-6 border-b border-white/10 pb-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-white/40">Producto (F1)</label>
                                <input id="product-search" type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar..." className="bg-white/10 border-none rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:ring-2 ring-[#FFD60A]/50" autoComplete="off" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Subtotal</span><span className="font-bold">${subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between items-end gap-6"><div><p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Total</p><p className="text-5xl font-black tracking-tighter text-[#FFD60A]">${total.toLocaleString()}</p></div></div>
                    </div>
                </div>

                {/* RIGHT: PRODUCTS */}
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <div className="flex items-center gap-4 mb-8">
                        {(activeCategory || productSearch) && (
                            <button onClick={() => { setActiveCategory(null); setProductSearch(""); }} className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors"><ChevronDown className="rotate-90" size={24} /></button>
                        )}
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{productSearch ? `Resultados: "${productSearch}"` : activeCategory ? categories.find((c: any) => c.id === activeCategory)?.name : "Categorías"}</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                        {!activeCategory && !productSearch && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                {categories.map((cat: any) => (
                                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="aspect-[4/3] flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-white border-2 border-transparent hover:border-black shadow-sm hover:shadow-2xl transition-all group text-center">
                                        <h4 className="font-black text-gray-900 text-xl group-hover:scale-110 transition-transform">{cat.name}</h4>
                                        <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">{products.filter((p: any) => p.category_id === cat.id).length} Items</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {(activeCategory || productSearch) && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-12">
                                {displayProducts.map((item: any) => (
                                    <button key={item.id} onClick={() => handleAddToCart(item)} className="aspect-square flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-white border-2 border-transparent hover:border-black shadow-sm hover:shadow-2xl transition-all group">
                                        <h4 className="font-bold text-gray-900 text-sm mb-2 group-hover:scale-110 transition-transform">{item.name}</h4>
                                        <p className="text-[10px] font-black text-gray-400 group-hover:text-black transition-colors">${Number(item.price).toLocaleString()}</p>
                                    </button>
                                ))}
                                {displayProducts.length === 0 && <div className="col-span-full text-center py-20 text-gray-400">No hay productos</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showReceiptModal && (
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
            )}

            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-20">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white w-full max-w-5xl h-full max-h-[600px] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                        <div className="md:w-1/3 bg-[#FFD60A] p-10 flex flex-col justify-between relative overflow-hidden">
                            <div><h3 className="text-lg font-black uppercase tracking-widest opacity-40 mb-2">Total</h3><p className="text-6xl font-black tracking-tighter text-black mb-8">${total.toLocaleString()}</p></div>
                            <div className="mt-8"><p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Detalles</p><div className="text-sm font-bold flex flex-col gap-1"><span>Items: {cart.length}</span></div></div>
                        </div>
                        <div className="flex-1 p-12 bg-white flex flex-col">
                            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Método de Pago</h3>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button onClick={() => setPaymentMethod('CASH')} className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'CASH' ? 'border-[#FFD60A] bg-[#FFD60A]/5' : 'border-gray-100'}`}><p className="font-black text-lg">Efectivo</p></button>
                                <button onClick={() => setPaymentMethod('MERCADO_PAGO')} className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'MERCADO_PAGO' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><p className="font-black text-lg">Mercado Pago</p></button>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-3xl p-8 flex items-center justify-center border border-gray-100">
                                {paymentMethod === 'CASH' && <input type="number" placeholder={total.toString()} className="text-4xl font-black text-center bg-transparent outline-none w-full" autoFocus />}
                                {paymentMethod === 'MERCADO_PAGO' && (
                                    <div className="text-center w-full">
                                        {isGeneratingQR ? <Loader2 className="animate-spin" /> : qrCodeUrl ? <div className="flex flex-col items-center gap-6"><div className="bg-white p-6 rounded-[2rem] shadow-2xl"><QRCodeSVG value={qrCodeUrl} size={180} /></div></div> : <p className="text-red-500">Error QR</p>}
                                    </div>
                                )}
                            </div>
                            <div className="mt-16 flex gap-4">
                                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-6 rounded-3xl bg-gray-50 text-gray-400 font-bold hover:bg-gray-100">Volver</button>
                                <button disabled={isFinishing} onClick={finishOrder} className="flex-[2] py-6 rounded-[2rem] bg-black text-[#FFD60A] font-black hover:scale-[1.03] disabled:opacity-20 shadow-2xl">{isFinishing ? "..." : "Confirmar Venta"}</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
