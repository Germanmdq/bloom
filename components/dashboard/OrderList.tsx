"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import { Loader2, Receipt, Calendar, CreditCard, Banknote, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

export function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setOrders(data as Order[]);
        }
        setLoading(false);
    }

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'CASH': return <Banknote size={16} className="text-green-500" />;
            case 'CARD': return <CreditCard size={16} className="text-blue-500" />;
            case 'MERCADO_PAGO': return <Smartphone size={16} className="text-sky-500" />;
            default: return <Receipt size={16} />;
        }
    };

    const getPaymentLabel = (method: string) => {
        switch (method) {
            case 'CASH': return 'Efectivo';
            case 'CARD': return 'Tarjeta';
            case 'MERCADO_PAGO': return 'MP Pago';
            default: return method;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-gray-200" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando órdenes...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-20 text-center border border-white/50 shadow-xl">
                <Receipt size={64} className="mx-auto text-gray-200 mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay órdenes registradas</h3>
                <p className="text-gray-500">Las ventas que realices aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order, idx) => (
                    <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/70 backdrop-blur-2xl rounded-[2rem] p-8 border border-white/40 shadow-lg hover:shadow-2xl transition-all group"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-black text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">
                                {order.table_id}
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                <p className="text-2xl font-black text-gray-900">${Number(order.total).toLocaleString("es-AR")}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                                    <Calendar size={14} />
                                </div>
                                <span>{new Date(order.created_at).toLocaleString("es-AR", {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                                    {getPaymentIcon(order.payment_method)}
                                </div>
                                <span className="font-bold">{getPaymentLabel(order.payment_method)}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">ID: {order.id.split('-')[0]}</span>
                            <button className="text-[10px] font-black text-black uppercase tracking-widest hover:underline">Ver Ticket</button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
