"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconChartPie, IconCurrencyDollar, IconCreditCard, IconWallet, IconCalendar, IconLoader2, IconTrendingUp, IconShoppingBag, IconReceipt, IconRefresh, IconPackage, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

type Timeframe = 'TODAY' | 'WEEK' | 'MONTH';

export default function ReportsPage() {
    const [stats, setStats] = useState({
        cash: 0,
        card: 0,
        mercadoPago: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalPurchases: 0,
        netBalance: 0,
        expensesByCategory: {} as Record<string, number>,
        productsByCategory: {} as Record<string, Record<string, number>>,
        salesCount: 0
    });
    const [timeframe, setTimeframe] = useState<Timeframe>('TODAY');
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        fetchReports();
    }, [timeframe]);

    async function fetchReports() {
        setLoading(true);
        const now = new Date();
        let thresholdDate: string;
        
        if (timeframe === 'TODAY') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            thresholdDate = startOfDay.toISOString();
        } else if (timeframe === 'WEEK') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
            startOfWeek.setHours(0, 0, 0, 0);
            thresholdDate = startOfWeek.toISOString();
        } else {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            thresholdDate = startOfMonth.toISOString();
        }

        try {
            const [salesRes, comprasRes, gastosFijosRes, productsRes] = await Promise.all([
                supabase.from('orders').select('total, payment_method, items').gte('created_at', thresholdDate),
                supabase.from('compras').select('total, created_at').gte('created_at', thresholdDate),
                supabase.from('gastos_fijos').select('nombre, historial_pagos, categoria'),
                supabase.from('products').select('name, categories(name)')
            ]);

            if (salesRes.error) throw salesRes.error;
            if (comprasRes.error) throw comprasRes.error;
            if (gastosFijosRes.error) throw gastosFijosRes.error;

            const productMappings = (productsRes.data || []).reduce((acc, p) => {
                acc[p.name] = (p.categories as any)?.name || "Otros";
                return acc;
            }, {} as Record<string, string>);

            // Procesar Ventas
            const prodByCat: Record<string, Record<string, number>> = {};
            const totals = (salesRes.data || []).reduce((acc, order) => {
                const amount = Number(order.total);
                if (order.payment_method === 'CASH') acc.cash += amount;
                else if (order.payment_method === 'CARD') acc.card += amount;
                else if (order.payment_method === 'MERCADO_PAGO') acc.mercadoPago += amount;
                acc.totalSales += amount;
                acc.salesCount += 1;

                (order.items as any[] || []).forEach(item => {
                    const catName = productMappings[item.name] || "Otros";
                    if (!prodByCat[catName]) prodByCat[catName] = {};
                    prodByCat[catName][item.name] = (prodByCat[catName][item.name] || 0) + (item.quantity || 1);
                });
                return acc;
            }, { cash: 0, card: 0, mercadoPago: 0, totalSales: 0, salesCount: 0 });

            // Procesar Compras (Mercadería)
            const totalPurchases = (comprasRes.data || []).reduce((sum, c) => sum + Number(c.total), 0);

            // Procesar Gastos Fijos (Pagos realizados en el periodo)
            let totalFixedExpenses = 0;
            const expByCat: Record<string, number> = {};
            
            (gastosFijosRes.data || []).forEach(g => {
                if (Array.isArray(g.historial_pagos)) {
                    g.historial_pagos.forEach((p: any) => {
                        if (p.fecha >= thresholdDate) {
                            const monto = Number(p.monto);
                            totalFixedExpenses += monto;
                            const cat = g.categoria || 'General';
                            expByCat[cat] = (expByCat[cat] || 0) + monto;
                        }
                    });
                }
            });

            setStats({
                ...totals,
                totalExpenses: totalFixedExpenses,
                totalPurchases: totalPurchases,
                netBalance: totals.totalSales - (totalFixedExpenses + totalPurchases),
                expensesByCategory: expByCat,
                productsByCategory: prodByCat
            });
        } catch (error: any) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    }

    const cashPercentage = stats.totalSales > 0 ? (stats.cash / stats.totalSales) * 100 : 0;
    const cardPercentage = stats.totalSales > 0 ? (stats.card / stats.totalSales) * 100 : 0;
    const mpPercentage = stats.totalSales > 0 ? (stats.mercadoPago / stats.totalSales) * 100 : 0;

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto pb-40">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <IconChartPie className="text-[#FFD60A]" size={20} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900">Reporte Diario</h1>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Estatus del negocio en tiempo real</p>
                </div>
                
                <div className="flex bg-gray-100/80 backdrop-blur-xl p-1 rounded-2xl border border-gray-200">
                    {(['TODAY', 'WEEK', 'MONTH'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                timeframe === tf 
                                ? 'bg-white text-black shadow-sm border border-gray-100' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tf === 'TODAY' ? 'Hoy' : tf === 'WEEK' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Sincronizando datos...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <SummaryCard 
                            title="Ingresos Brutos" 
                            amount={stats.totalSales} 
                            subtitle={`${stats.salesCount} pedidos`} 
                            icon={IconTrendingUp} 
                            color="emerald" 
                        />
                        <SummaryCard 
                            title="Compras Mercadería" 
                            amount={stats.totalPurchases} 
                            subtitle="Inversión en stock" 
                            icon={IconShoppingBag} 
                            color="amber" 
                        />
                        <SummaryCard 
                            title="Gastos Fijos" 
                            amount={stats.totalExpenses} 
                            subtitle="Sueldos y servicios" 
                            icon={IconReceipt} 
                            color="red" 
                        />
                        <SummaryCard 
                            title="Balance Neto" 
                            amount={stats.netBalance} 
                            subtitle="Margen de ganancia" 
                            icon={IconCurrencyDollar} 
                            color={stats.netBalance >= 0 ? "black" : "red-dark"} 
                            dark
                        />
                    </div>

                    {/* Main Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Breakdown Chart-like area */}
                        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Medios de Pago</h3>
                                <button onClick={fetchReports} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                                    <IconRefresh size={18} className="text-gray-300" />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <PaymentRow label="Efectivo" amount={stats.cash} percentage={cashPercentage} icon={IconWallet} color="bg-emerald-500" textColor="text-emerald-600" bgColor="bg-emerald-50" />
                                <PaymentRow label="Tarjeta" amount={stats.card} percentage={cardPercentage} icon={IconCreditCard} color="bg-blue-500" textColor="text-blue-600" bgColor="bg-blue-50" />
                                <PaymentRow label="Mercado Pago" amount={stats.mercadoPago} percentage={mpPercentage} icon={IconCurrencyDollar} color="bg-sky-500" textColor="text-sky-600" bgColor="bg-sky-50" />
                            </div>
                        </div>

                        {/* Profitability Column */}
                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-10">Rentabilidad</h3>
                            <div className="space-y-8 flex-1">
                                <div className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos</span>
                                    <span className="text-lg font-black text-gray-900 flex items-center gap-2"><IconArrowUpRight size={16} className="text-emerald-500" /> ${stats.totalSales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Egresos</span>
                                    <span className="text-lg font-bold text-red-500 flex items-center gap-2"><IconArrowDownRight size={16} className="text-red-500" /> -${(stats.totalExpenses + stats.totalPurchases).toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div className="flex justify-between items-center py-4 rounded-3xl bg-gray-50/50 px-6">
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Margen</span>
                                    <span className={`text-2xl font-black ${stats.netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {stats.totalSales > 0 ? ((stats.netBalance / stats.totalSales) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-8">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Meta Diaria: $250.000</p>
                                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-1">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${Math.min(100, (stats.totalSales / 250000) * 100)}%` }} 
                                        className="h-full bg-black rounded-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Units Sold Section - Full Width Grid */}
                    <div className="w-full">
                         <div className="flex items-center gap-3 mb-8 ml-2">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                                <IconShoppingBag size={20} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Unidades Vendidas</h3>
                        </div>

                        {Object.keys(stats.productsByCategory).length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
                                <IconPackage size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay ventas registradas</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {Object.entries(stats.productsByCategory).map(([category, items]) => (
                                    <motion.div 
                                        key={category} 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col hover:border-gray-200 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter truncate pr-4">{category}</h4>
                                            <span className="bg-gray-100 text-gray-900 px-3 py-1 rounded-full text-[10px] font-black shrink-0">
                                                {Object.values(items).reduce((a, b) => a + b, 0)} U.
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries(items)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([name, qty]) => (
                                                    <div key={name} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 border-dashed">
                                                        <span className="text-xs font-bold text-gray-500 truncate pr-4">{name}</span>
                                                        <span className="font-black text-gray-900 text-xs shrink-0">x{qty}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponentes para Limpieza de Código

function SummaryCard({ title, amount, subtitle, icon: Icon, color, dark }: any) {
    const colors: any = {
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
        black: "bg-white/10 text-white",
        "red-dark": "bg-red-500/10 text-red-400"
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${dark ? "bg-black text-white" : "bg-white border border-gray-100"} p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group`}>
            <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
            <h4 className="text-3xl font-black tracking-tighter">${amount.toLocaleString()}</h4>
            <p className={`text-xs font-bold mt-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>{subtitle}</p>
            {dark && <div className="absolute top-[-20%] right-[-10%] opacity-5"><Icon size={120} /></div>}
        </motion.div>
    );
}

function PaymentRow({ label, amount, percentage, icon: Icon, color, textColor, bgColor }: any) {
    return (
        <div className="group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${bgColor} ${textColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-900 leading-none">{label}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{percentage.toFixed(1)}% de los ingresos</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">${amount.toLocaleString()}</p>
                </div>
            </div>
            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full ${color} shadow-sm`} />
            </div>
        </div>
    );
}
