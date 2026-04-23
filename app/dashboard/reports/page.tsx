"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, DollarSign, CreditCard, Wallet, Calendar, Loader2, TrendingUp, TrendingDown, ShoppingBag, Receipt, ArrowRight, RefreshCcw, Package } from "lucide-react";

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
            // Hoy desde las 00:00:00
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            thresholdDate = startOfDay.toISOString();
        } else if (timeframe === 'WEEK') {
            // Desde el lunes de esta semana
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
            const startOfWeek = new Date(now.setDate(diff));
            startOfWeek.setHours(0, 0, 0, 0);
            thresholdDate = startOfWeek.toISOString();
        } else {
            // Desde el 1ero de este mes
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            thresholdDate = startOfMonth.toISOString();
        }

        try {
            // Paralelizar las consultas para máxima velocidad
            const [salesRes, expensesRes, productsRes] = await Promise.all([
                supabase
                    .from('orders')
                    .select('total, payment_method, items')
                    .gte('created_at', thresholdDate),
                supabase
                    .from('expenses')
                    .select('amount, category')
                    .gte('expense_date', thresholdDate.split('T')[0]),
                supabase
                    .from('products')
                    .select('name, categories(name)')
            ]);

            if (salesRes.error) throw salesRes.error;
            if (expensesRes.error) throw expensesRes.error;
            if (productsRes.error) throw productsRes.error;

            const salesData = salesRes.data || [];
            const expensesData = expensesRes.data || [];
            const productMappings = (productsRes.data || []).reduce((acc, p) => {
                acc[p.name] = (p.categories as any)?.name || "Otros";
                return acc;
            }, {} as Record<string, string>);

            const prodByCat: Record<string, Record<string, number>> = {};

            const totals = salesData.reduce((acc, order) => {
                const amount = Number(order.total);
                if (order.payment_method === 'CASH') acc.cash += amount;
                else if (order.payment_method === 'CARD') acc.card += amount;
                else if (order.payment_method === 'MERCADO_PAGO') acc.mercadoPago += amount;
                acc.totalSales += amount;
                acc.salesCount += 1;

                // ── AGREGAR VENTAS POR PRODUCTO ──
                const items = order.items as any[] || [];
                items.forEach(item => {
                    const catName = productMappings[item.name] || "Otros";
                    if (!prodByCat[catName]) prodByCat[catName] = {};
                    prodByCat[catName][item.name] = (prodByCat[catName][item.name] || 0) + (item.quantity || 1);
                });

                return acc;
            }, { cash: 0, card: 0, mercadoPago: 0, totalSales: 0, salesCount: 0 });

            let totalExp = 0;
            let totalPurch = 0;
            const expByCat: Record<string, number> = {};
            
            expensesData.forEach(exp => {
                const amount = Number(exp.amount);
                if (exp.category === 'Mercadería') {
                    totalPurch += amount;
                } else {
                    totalExp += amount;
                }
                expByCat[exp.category] = (expByCat[exp.category] || 0) + amount;
            });

            setStats({
                ...totals,
                totalExpenses: totalExp,
                totalPurchases: totalPurch,
                netBalance: totals.totalSales - (totalExp + totalPurch),
                expensesByCategory: expByCat,
                productsByCategory: prodByCat
            });
        } catch (error: any) {
            console.error("Error fetching reports:", error);
            alert("Error al cargar reportes: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const cashPercentage = stats.totalSales > 0 ? (stats.cash / stats.totalSales) * 100 : 0;
    const cardPercentage = stats.totalSales > 0 ? (stats.card / stats.totalSales) * 100 : 0;
    const mpPercentage = stats.totalSales > 0 ? (stats.mercadoPago / stats.totalSales) * 100 : 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-40">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">Cierre de Caja</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs mt-1">Análisis de Rendimiento</p>
                </div>
                
                <div className="flex bg-gray-100/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-gray-200">
                    {(['TODAY', 'WEEK', 'MONTH'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${
                                timeframe === tf 
                                ? 'bg-white text-black shadow-md border border-gray-100' 
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
                    <Loader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Procesando reportes...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* TOP SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ventas Totales</p>
                            <h4 className="text-3xl font-black text-gray-900">${stats.totalSales.toLocaleString()}</h4>
                            <p className="text-xs font-bold text-gray-400 mt-2">{stats.salesCount} pedidos realizados</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShoppingBag size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Compras Insumos</p>
                            <h4 className="text-3xl font-black text-gray-900">${stats.totalPurchases.toLocaleString()}</h4>
                            <p className="text-xs font-bold text-gray-400 mt-2">Inversión en mercadería</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Receipt size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
                            <h4 className="text-3xl font-black text-gray-900">${stats.totalExpenses.toLocaleString()}</h4>
                            <p className="text-xs font-bold text-gray-400 mt-2">Servicios y otros</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-black p-8 rounded-[2.5rem] shadow-2xl shadow-black/20 group relative overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform">
                                <DollarSign size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 relative z-10">Balance Neto</p>
                            <h4 className={`text-3xl font-black relative z-10 ${stats.netBalance >= 0 ? "text-white" : "text-red-400"}`}>
                                ${stats.netBalance.toLocaleString()}
                            </h4>
                            <div className="absolute bottom-0 right-0 p-4 opacity-10">
                                <PieChart size={80} className="text-white" />
                            </div>
                        </motion.div>
                    </div>

                    {/* DETAILED AREA */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* PAYMENT METHODS BREAKDOWN */}
                        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Ingresos por Medio de Pago</h3>
                                <RefreshCcw size={18} className="text-gray-300 cursor-pointer hover:rotate-180 transition-all duration-500" onClick={fetchReports} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 text-green-600">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Wallet size={20} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                                    </div>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter">${stats.cash.toLocaleString()}</p>
                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${cashPercentage}%` }} className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cashPercentage.toFixed(1)}% del total</p>
                                </div>

                                <div className="space-y-5 border-l border-gray-50 pl-8">
                                    <div className="flex items-center gap-3 text-blue-600">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><CreditCard size={20} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Tarjeta</span>
                                    </div>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter">${stats.card.toLocaleString()}</p>
                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${cardPercentage}%` }} className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cardPercentage.toFixed(1)}% del total</p>
                                </div>

                                <div className="space-y-5 border-l border-gray-50 pl-8">
                                    <div className="flex items-center gap-3 text-cyan-600">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center"><DollarSign size={20} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Mercado Pago</span>
                                    </div>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter">${stats.mercadoPago.toLocaleString()}</p>
                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${mpPercentage}%` }} className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{mpPercentage.toFixed(1)}% del total</p>
                                </div>
                            </div>
                        </div>

                        {/* BALANCE KPI */}
                        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-8">Rentabilidad</h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ingresos Brutos</span>
                                        <span className="text-lg font-black text-gray-900">${stats.totalSales.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Inversión (Compras)</span>
                                        <span className="text-lg font-bold text-orange-600">-${stats.totalPurchases.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Egresos (Gastos)</span>
                                        <span className="text-lg font-bold text-red-600">-${stats.totalExpenses.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-10 pt-8 border-t border-gray-100">
                                <div className="flex items-baseline justify-between mb-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resultado de Hoy</p>
                                    <p className={`text-3xl font-black ${stats.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        ${stats.netBalance.toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${stats.totalSales > 0 ? Math.max(0, (stats.netBalance / stats.totalSales) * 100) : 0}%` }} 
                                        className="h-full bg-green-500" 
                                    />
                                </div>
                                <p className="mt-3 text-[10px] font-black text-green-600 uppercase tracking-widest">Margen: {stats.totalSales > 0 ? ((stats.netBalance / stats.totalSales) * 100).toFixed(1) : 0}%</p>
                            </div>
                        </div>
                    </div>

                    {/* EXPENSES BREAKDOWN SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Calendar size={20} className="text-gray-400" /></div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Top Gastos / Inversión</h3>
                            </div>
                            
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(stats.expensesByCategory).length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Receipt size={40} className="mx-auto text-gray-100 mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Sin gastos en este período</p>
                                    </div>
                                ) : (
                                    Object.entries(stats.expensesByCategory)
                                        .sort((a,b) => b[1] - a[1])
                                        .map(([cat, amount]) => (
                                            <div key={cat} className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50 group hover:bg-white hover:border-gray-200 hover:shadow-md transition-all">
                                                <div>
                                                    <span className="font-black text-gray-800 text-sm">{cat}</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{(amount / (stats.totalExpenses + stats.totalPurchases) * 100).toFixed(1)}% del egreso</p>
                                                </div>
                                                <span className="font-black text-red-600 text-lg">-${amount.toLocaleString()}</span>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                    {/* PRODUCTS BY CATEGORY BREAKDOWN SECTION */}
                    <div className="mt-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><ShoppingBag size={20} className="text-orange-500" /></div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Unidades Vendidas por Categoría</h3>
                        </div>

                        {Object.keys(stats.productsByCategory).length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
                                <Package size={48} className="mx-auto text-gray-100 mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay ventas registradas en este período</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(stats.productsByCategory).map(([category, items]) => (
                                    <div key={category} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{category}</h4>
                                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                {Object.values(items).reduce((a, b) => a + b, 0)} u.
                                            </span>
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            {Object.entries(items)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([name, qty]) => (
                                                    <div key={name} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 group">
                                                        <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{name}</span>
                                                        <span className="font-black text-gray-900 text-sm bg-gray-50 px-2 py-1 rounded-lg">x{qty}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between mt-8">
                        <div className="relative z-10">
                            <h3 className="text-white text-xl font-black tracking-tight uppercase mb-4">Nota del Sistema</h3>
                            <p className="text-gray-400 font-bold text-sm leading-relaxed mb-6">
                                Los datos presentados son un reflejo directo de las órdenes cerradas y los gastos cargados manualmente. 
                                Asegúrate de registrar todas las compras de insumos para un balance preciso.
                            </p>
                        </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Última Actualización</p>
                                    <p className="text-white font-bold text-sm">{new Date().toLocaleTimeString('es-AR')}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex-1">
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Estado de Sincronización</p>
                                    <p className="text-green-400 font-bold text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Tiempo Real
                                    </p>
                                </div>
                            </div>
                            
                            {/* Decoration */}
                            <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
