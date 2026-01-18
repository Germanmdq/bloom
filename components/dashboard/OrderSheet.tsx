"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Check, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
};

type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
};

export function OrderSheet({ tableId, onClose, onOrderComplete }: OrderSheetProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [waiters, setWaiters] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MERCADO_PAGO'>('CASH');
    const [selectedWaiter, setSelectedWaiter] = useState<string>("");
    const [invoiceType, setInvoiceType] = useState('Factura C');
    const [clientName, setClientName] = useState('Consumidor Final');
    const [isFinishing, setIsFinishing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [extraTotal, setExtraTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*').eq('active', true);
        const { data: waiterData } = await supabase.from('profiles').select('*').eq('role', 'WAITER');
        const { data: tableData } = await supabase.from('salon_tables').select('total').eq('id', tableId).single();

        if (catData) {
            setCategories(catData);
            if (catData.length > 0) setActiveCategory(catData[0].id);
        }
        if (prodData) setProducts(prodData);
        if (waiterData) {
            setWaiters(waiterData);
            if (waiterData.length > 0) setSelectedWaiter(waiterData[0].id);
        }
        if (tableData) {
            setExtraTotal(Number(tableData.total) || 0);
        }
        setLoading(false);
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + extraTotal;
    const discount = 0; // Future implementation
    const total = subtotal - discount;

    const addToCart = async (product: any) => {
        const itemPrice = Number(product.price);
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { productId: product.id, name: product.name, price: itemPrice, quantity: 1 }];
        });

        // Update database total and set as OCCUPIED
        const newTotal = total + itemPrice;
        await supabase.from('salon_tables')
            .update({ status: 'OCCUPIED', total: newTotal })
            .eq('id', tableId);
    };

    const finishOrder = async () => {
        if (total === 0) return;
        setIsFinishing(true);

        // 1. Insert the order
        const { error: orderError } = await supabase.from('orders').insert([{
            table_id: tableId,
            total: total,
            payment_method: paymentMethod,
            waiter_id: selectedWaiter || null
        }]);

        if (orderError) {
            alert(`Error al guardar: ${orderError.message}`);
        } else {
            // 2. Clear the table status in database
            const { error: tableError } = await supabase.from('salon_tables')
                .update({ status: 'FREE', total: 0 })
                .eq('id', tableId);

            if (tableError) {
                console.error("Error clearing table:", tableError);
            }

            alert(`¡Mesa cobrada exitosamente!`);
            if (onOrderComplete) onOrderComplete();
            onClose();
        }
        setIsFinishing(false);
    };


    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
                <Loader2 className="animate-spin text-black" size={40} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando Sistema POS...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E]">
            {/* 1. TOP METADATA HEADER (Yellow/Gold Accents like reference but modern) */}
            <div className="bg-[#FFD60A] p-4 flex flex-wrap items-center gap-6 border-b border-black/5 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-black">
                        {tableId}
                    </div>
                    <span className="font-black text-black uppercase tracking-tighter text-xl">Mesa Bar {tableId}</span>
                </div>

                <div className="h-10 w-[1px] bg-black/10 mx-2" />

                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-black/40 uppercase">Comprobante (F7)</span>
                        <select
                            value={invoiceType}
                            onChange={(e) => setInvoiceType(e.target.value)}
                            className="bg-white/80 border-none rounded-lg px-3 py-1 text-sm font-bold outline-none focus:ring-2 ring-black/10"
                        >
                            <option>Factura C</option>
                            <option>Factura B</option>
                            <option>Factura A</option>
                            <option>Ticket</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-black/40 uppercase">Cliente</span>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="bg-white/80 border-none rounded-lg px-3 py-1 text-sm font-bold outline-none focus:ring-2 ring-black/10 w-40"
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-black/40 uppercase">Mozo asignado</span>
                        <select
                            value={selectedWaiter}
                            onChange={(e) => setSelectedWaiter(e.target.value)}
                            className="bg-white/80 border-none rounded-lg px-3 py-1 text-sm font-bold outline-none focus:ring-2 ring-black/10"
                        >
                            {waiters.map(w => (
                                <option key={w.id} value={w.id}>{w.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-black/40 uppercase">Estado Venta</p>
                        <span className="bg-green-500/20 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Abierta</span>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-black/5 hover:bg-black hover:text-white transition-all flex items-center justify-center">
                        ✕
                    </button>
                </div>
            </div>

            {/* 2. MAIN POS AREA */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Items Table (Professional POS list) */}
                <div className="w-[45%] flex flex-col bg-white border-r border-black/5">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 p-4 bg-gray-50 border-b border-black/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <div>Producto</div>
                        <div className="text-right">Precio</div>
                        <div className="text-right">Cant</div>
                        <div className="text-right">Total</div>
                        <div className="text-right">Desc.</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {extraTotal > 0 && (
                            <div className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 px-4 py-3 border-b border-gray-50 items-center bg-orange-50/30 ring-1 ring-orange-100/50">
                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                                    Cargos Previos
                                </div>
                                <div className="text-right text-xs font-medium text-gray-500">-</div>
                                <div className="text-right text-xs font-medium text-gray-500">1</div>
                                <div className="text-right font-black text-gray-900">${extraTotal.toLocaleString()}</div>
                                <div className="text-right text-xs text-gray-400">0.00</div>
                            </div>
                        )}
                        {cart.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_80px_60px_100px_80px] gap-2 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50 transition-colors">
                                <div className="font-bold text-sm text-gray-900">{item.name}</div>
                                <div className="text-right text-xs font-medium text-gray-500">${item.price.toLocaleString()}</div>
                                <div className="text-right text-xs font-medium text-gray-500">{item.quantity}</div>
                                <div className="text-right font-black text-gray-900">${(item.price * item.quantity).toLocaleString()}</div>
                                <div className="text-right text-xs text-green-500">0.00</div>
                            </div>
                        ))}
                    </div>

                    {/* Table Footer / Summary */}
                    <div className="p-8 bg-gray-900 text-white mt-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Subtotal</span>
                            <span className="font-bold">${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black uppercase text-green-400 tracking-widest">Descuento Total</span>
                            <span className="font-bold text-green-400">-$0</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Total a cobrar</p>
                                <p className="text-5xl font-black tracking-tighter text-[#FFD60A]">${total.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-white/20 mt-1 uppercase">Venta en curso</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                                    {cart.reduce((s, i) => s + i.quantity, 0)} ítems
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Square Category & Product Selector */}
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    {categories.length > 1 && (
                        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border-2 ${activeCategory === cat.id
                                        ? "bg-black text-white border-black scale-105 shadow-xl"
                                        : "bg-white text-gray-400 border-white hover:border-gray-100"
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-12">
                            {products.filter(p => p.category_id === activeCategory).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="aspect-square flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-white border-2 border-transparent hover:border-black shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                                >
                                    <h4 className="font-bold text-gray-900 text-sm leading-tight mb-2 group-hover:scale-110 transition-transform">{item.name}</h4>
                                    <p className="text-[10px] font-black text-gray-400 group-hover:text-black transition-colors">${Number(item.price).toLocaleString()}</p>

                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-auto flex gap-4 pt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 py-6 rounded-[2rem] bg-white text-gray-400 font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                        >
                            F5 Cerrar
                        </button>
                        <button
                            disabled={total === 0 || isFinishing}
                            onClick={() => setShowPaymentModal(true)}
                            className="flex-[2] py-6 rounded-[2rem] bg-black text-[#FFD60A] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3"
                        >
                            <span className="text-xl">💰</span>
                            F12 Cobrar Selección
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal Override */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 md:p-20">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" onClick={() => setShowPaymentModal(false)} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white w-full max-w-[600px] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.4)] flex flex-col"
                    >
                        <div className="p-12 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h4 className="text-4xl font-black text-gray-900 tracking-tighter">Cerrar Ticket</h4>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Mesa {tableId} • {invoiceType}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Final</p>
                                    <p className="text-4xl font-black text-black tracking-tighter">${total.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Método de Pago</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        {(['CASH', 'CARD', 'MERCADO_PAGO'] as const).map((method) => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`py-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 transition-all border-2 ${paymentMethod === method
                                                    ? "bg-black text-[#FFD60A] border-black shadow-2xl scale-105"
                                                    : "bg-gray-50 text-gray-300 border-transparent hover:border-gray-100"
                                                    }`}
                                            >
                                                {method === 'CASH' && <Check size={24} />}
                                                {method === 'CARD' && <User size={24} />}
                                                {method === 'MERCADO_PAGO' && <Plus size={24} />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {method === 'CASH' ? 'Efectivo' : method === 'CARD' ? 'Tarjeta' : 'MP Pago'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-16 flex gap-4">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 py-6 rounded-3xl bg-gray-50 text-gray-400 font-bold text-lg hover:bg-gray-100 transition-all border border-gray-100"
                                >
                                    Volver
                                </button>
                                <button
                                    disabled={isFinishing}
                                    onClick={finishOrder}
                                    className="flex-[2] py-6 rounded-[2rem] bg-black text-[#FFD60A] font-black text-xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-20 shadow-2xl"
                                >
                                    {isFinishing ? "Procesando..." : "Confirmar Venta"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
