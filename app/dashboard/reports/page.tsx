"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { PieChart, DollarSign, CreditCard, Wallet, Calendar, Loader2 } from "lucide-react";

export default function ReportsPage() {
    const [stats, setStats] = useState({
        cash: 0,
        card: 0,
        mercadoPago: 0,
        total: 0
    });
    const [timeframe, setTimeframe] = useState<'WEEK' | 'MONTH'>('MONTH');
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        fetchReports();
    }, [timeframe]);

    async function fetchReports() {
        setLoading(true);
        setError(null);

        // Calculate the date threshold
        const now = new Date();
        const daysToSubtract = timeframe === 'WEEK' ? 7 : 30;
        const thresholdDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000)).toISOString();

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', thresholdDate); // Filter by date

        if (!error && data) {
            const totals = data.reduce((acc, order) => {
                const amount = parseFloat(order.total);
                if (order.payment_method === 'CASH') acc.cash += amount;
                else if (order.payment_method === 'CARD') acc.card += amount;
                else if (order.payment_method === 'MERCADO_PAGO') acc.mercadoPago += amount;
                acc.total += amount;
                return acc;
            }, { cash: 0, card: 0, mercadoPago: 0, total: 0 });

            setStats(totals);
        } else if (error) {
            console.error("Error fetching reports:", error);
        }
        setLoading(false);
    }

    const [error, setError] = useState<string | null>(null);

    const cashPercentage = stats.total > 0 ? (stats.cash / stats.total) * 100 : 0;
    const cardPercentage = stats.total > 0 ? (stats.card / stats.total) * 100 : 0;
    const mpPercentage = stats.total > 0 ? (stats.mercadoPago / stats.total) * 100 : 0;

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-gray-900">Reportes Financieros</h2>
                    <p className="text-gray-500 font-medium">Análisis de ventas por período</p>
                </div>
                <div className="flex gap-2 bg-white/50 p-2 rounded-[1.5rem] border border-white/40 shadow-sm">
                    <button
                        onClick={() => setTimeframe('MONTH')}
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${timeframe === 'MONTH' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setTimeframe('WEEK')}
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${timeframe === 'WEEK' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Semanal
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Calculando indicadores...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 bg-white/70 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/40 shadow-xl flex flex-col justify-between overflow-hidden relative">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">
                                    Facturación {timeframe === 'MONTH' ? 'del Mes' : 'de la Semana'}
                                </p>
                                <h3 className="text-7xl font-black text-gray-900 tracking-tighter mb-14">
                                    ${stats.total.toLocaleString()}
                                </h3>
                            </div>

                            <div className="grid grid-cols-3 gap-8 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <Wallet size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900">${stats.cash.toLocaleString()}</p>
                                    <div className="h-1.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cashPercentage}%` }}
                                            className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <CreditCard size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Tarjeta</span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900">${stats.card.toLocaleString()}</p>
                                    <div className="h-1.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cardPercentage}%` }}
                                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-cyan-600">
                                        <DollarSign size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">M. Pago</span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900">${stats.mercadoPago.toLocaleString()}</p>
                                    <div className="h-1.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${mpPercentage}%` }}
                                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Background decoration */}
                            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-gray-50 rounded-full blur-[100px] opacity-60" />
                        </div>

                        <div className="bg-black p-12 rounded-[3.5rem] shadow-2xl shadow-black/40 flex flex-col justify-center text-center relative overflow-hidden group">
                            <PieChart className="text-white/10 mx-auto mb-8 group-hover:scale-110 transition-transform duration-700" size={100} />
                            <h4 className="text-white text-2xl font-black tracking-tight mb-2">Mix de Pagos</h4>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">Distribución Real</p>

                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                                    <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                                    <span className="text-white text-xl font-black">{cashPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                                    <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Tarjeta</span>
                                    <span className="text-white text-xl font-black">{cardPercentage.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Glow effect */}
                            <div className="absolute bottom-[-50px] right-[-50px] w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/20 p-10 text-center border-dashed">
                        <Calendar className="mx-auto text-gray-300 mb-6" size={40} />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">Análisis de Tendencias</p>
                        <p className="text-gray-500 font-medium italic">Los datos mostrados corresponden a los últimos {timeframe === 'WEEK' ? '7' : '30'} días de actividad.</p>
                    </div>
                </>
            )}
        </div>
    );
}
