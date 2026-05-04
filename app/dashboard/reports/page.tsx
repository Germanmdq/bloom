"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconChartPie, IconCurrencyDollar, IconCreditCard, IconWallet, IconCalendar, IconLoader2, IconTrendingUp, IconShoppingBag, IconReceipt, IconRefresh, IconPackage, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

type Timeframe = 'TODAY' | 'WEEK' | 'MONTH';

const APERTURA_KEY = 'bloom_apertura_caja';

function getAperturaStored() {
    try {
        const raw = localStorage.getItem(APERTURA_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const today = new Date().toDateString();
        if (parsed.date !== today) return null;
        return parsed as { date: string; efectivo: number; mercadoPago: number; santander: number };
    } catch { return null; }
}

export default function ReportsPage() {
    const [stats, setStats] = useState({
        cash: 0,
        card: 0,
        mercadoPago: 0,
        santanderRio: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalPurchases: 0,
        netBalance: 0,
        expensesByCategory: {} as Record<string, number>,
        productsByCategory: {} as Record<string, Record<string, number>>,
        salesCount: 0,
        orders: [] as any[]
    });
    const [timeframe, setTimeframe] = useState<Timeframe>('TODAY');
    const [loading, setLoading] = useState(true);
    const [drillMethod, setDrillMethod] = useState<string | null>(null);
    const [apertura, setApertura] = useState<{ efectivo: number; mercadoPago: number; santander: number } | null>(null);
    const [editingApertura, setEditingApertura] = useState(false);
    const [aperturaForm, setAperturaForm] = useState({ efectivo: '', mercadoPago: '', santander: '' });

    const supabase = createClient();

    useEffect(() => {
        const stored = getAperturaStored();
        if (stored) setApertura({ efectivo: stored.efectivo, mercadoPago: stored.mercadoPago, santander: stored.santander });
    }, []);

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
                supabase.from('orders').select('id, total, payment_method, items, table_id, customer_name').gte('created_at', thresholdDate).order('created_at', { ascending: false }),
                supabase.from('compras').select('total, created_at').gte('created_at', thresholdDate),
                supabase.from('gastos_fijos').select('nombre, monto, estado, updated_at, historial_pagos, categoria'),
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
                else if (order.payment_method === 'SANTANDER_RIO' || order.payment_method === 'BANK_TRANSFER') acc.santanderRio += amount;
                acc.totalSales += amount;
                acc.salesCount += 1;

                (order.items as any[] || []).forEach(item => {
                    const catName = productMappings[item.name] || "Otros";
                    if (!prodByCat[catName]) prodByCat[catName] = {};
                    prodByCat[catName][item.name] = (prodByCat[catName][item.name] || 0) + (item.quantity || 1);
                });
                return acc;
            }, { cash: 0, card: 0, mercadoPago: 0, santanderRio: 0, totalSales: 0, salesCount: 0 });

            // Procesar Compras (Mercadería)
            const totalPurchases = (comprasRes.data || []).reduce((sum, c) => sum + Number(c.total), 0);

            // Procesar Gastos Fijos (Pagos realizados en el periodo)
            let totalFixedExpenses = 0;
            const expByCat: Record<string, number> = {};
            
            (gastosFijosRes.data || []).forEach(g => {
                const historial = Array.isArray(g.historial_pagos) ? g.historial_pagos : [];
                if (historial.length > 0) {
                    // Paid via partial payments — count each payment within the period
                    historial.forEach((p: any) => {
                        if (p.fecha >= thresholdDate) {
                            const monto = Number(p.monto);
                            totalFixedExpenses += monto;
                            const cat = g.categoria || 'General';
                            expByCat[cat] = (expByCat[cat] || 0) + monto;
                        }
                    });
                } else if (g.estado === 'pagado' && g.updated_at >= thresholdDate) {
                    // Paid via "marcar como pagado" — no historial_pagos entry
                    const monto = Number(g.monto);
                    totalFixedExpenses += monto;
                    const cat = g.categoria || 'General';
                    expByCat[cat] = (expByCat[cat] || 0) + monto;
                }
            });

            setStats({
                ...totals,
                totalExpenses: totalFixedExpenses,
                totalPurchases: totalPurchases,
                netBalance: totals.totalSales - (totalFixedExpenses + totalPurchases),
                expensesByCategory: expByCat,
                productsByCategory: prodByCat,
                orders: salesRes.data || []
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
    const santanderPercentage = stats.totalSales > 0 ? (stats.santanderRio / stats.totalSales) * 100 : 0;

    const drillOrders = drillMethod ? stats.orders.filter(o => {
        if (drillMethod === 'CASH') return o.payment_method === 'CASH';
        if (drillMethod === 'MERCADO_PAGO') return o.payment_method === 'MERCADO_PAGO';
        if (drillMethod === 'SANTANDER_RIO') return o.payment_method === 'SANTANDER_RIO' || o.payment_method === 'BANK_TRANSFER';
        if (drillMethod === 'CARD') return o.payment_method === 'CARD';
        return false;
    }) : [];

    const saveApertura = () => {
        const data = {
            date: new Date().toDateString(),
            efectivo: parseFloat(aperturaForm.efectivo) || 0,
            mercadoPago: parseFloat(aperturaForm.mercadoPago) || 0,
            santander: parseFloat(aperturaForm.santander) || 0,
        };
        localStorage.setItem(APERTURA_KEY, JSON.stringify(data));
        setApertura({ efectivo: data.efectivo, mercadoPago: data.mercadoPago, santander: data.santander });
        setEditingApertura(false);
    };

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
                    {/* APERTURA DE CAJA */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Apertura de Caja</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Dinero disponible al inicio del día</p>
                            </div>
                            <button onClick={() => { setAperturaForm({ efectivo: apertura?.efectivo?.toString() || '', mercadoPago: apertura?.mercadoPago?.toString() || '', santander: apertura?.santander?.toString() || '' }); setEditingApertura(true); }} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all">
                                {apertura ? 'Editar' : 'Registrar'}
                            </button>
                        </div>
                        {apertura ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100"><p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Efectivo</p><p className="text-2xl font-black text-emerald-700">${apertura.efectivo.toLocaleString('es-AR')}</p></div>
                                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100"><p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Mercado Pago</p><p className="text-2xl font-black text-sky-700">${apertura.mercadoPago.toLocaleString('es-AR')}</p></div>
                                <div className="bg-red-50 rounded-2xl p-5 border border-red-100"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Santander Río</p><p className="text-2xl font-black text-red-700">${apertura.santander.toLocaleString('es-AR')}</p></div>
                            </div>
                        ) : (
                            <p className="text-gray-400 font-bold text-sm">No registrada para hoy. Hacé clic en Registrar para ingresar el dinero en caja.</p>
                        )}
                    </div>

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
                                <PaymentRow label="Efectivo" amount={stats.cash} percentage={cashPercentage} icon={IconWallet} color="bg-emerald-500" textColor="text-emerald-600" bgColor="bg-emerald-50" onClick={() => setDrillMethod('CASH')} />
                                <PaymentRow label="Mercado Pago" amount={stats.mercadoPago} percentage={mpPercentage} icon={IconCurrencyDollar} color="bg-sky-500" textColor="text-sky-600" bgColor="bg-sky-50" onClick={() => setDrillMethod('MERCADO_PAGO')} />
                                <PaymentRow label="Santander Río" amount={stats.santanderRio} percentage={santanderPercentage} icon={IconCreditCard} color="bg-red-500" textColor="text-red-600" bgColor="bg-red-50" onClick={() => setDrillMethod('SANTANDER_RIO')} />
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

            {/* DRILL-DOWN MODAL */}
            <AnimatePresence>
                {drillMethod && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrillMethod(null)} />
                        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="relative bg-white rounded-[2rem] w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 uppercase">{drillMethod === 'CASH' ? 'Efectivo' : drillMethod === 'MERCADO_PAGO' ? 'Mercado Pago' : drillMethod === 'SANTANDER_RIO' ? 'Santander Río' : drillMethod}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{drillOrders.length} operaciones</p>
                                </div>
                                <button onClick={() => setDrillMethod(null)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                                {drillOrders.length === 0 ? (
                                    <p className="text-center text-gray-400 font-bold py-12 text-sm">Sin operaciones</p>
                                ) : drillOrders.map((order: any) => (
                                    <div key={order.id} className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                {order.customer_name ? `👤 ${order.customer_name}` : `Mesa ${order.table_id ?? '—'}`}
                                            </span>
                                            <span className="text-base font-black text-gray-900">${Number(order.total).toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {(order.items as any[] || []).map((item: any, idx: number) => (
                                                <span key={idx} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    {item.quantity > 1 ? `x${item.quantity} ` : ''}{item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* APERTURA EDIT MODAL */}
            <AnimatePresence>
                {editingApertura && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingApertura(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
                            <h3 className="text-xl font-black mb-6">Apertura de Caja</h3>
                            <div className="space-y-4 mb-6">
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectivo ($)</label><input type="number" value={aperturaForm.efectivo} onChange={e => setAperturaForm(f => ({ ...f, efectivo: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mercado Pago ($)</label><input type="number" value={aperturaForm.mercadoPago} onChange={e => setAperturaForm(f => ({ ...f, mercadoPago: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Santander Río ($)</label><input type="number" value={aperturaForm.santander} onChange={e => setAperturaForm(f => ({ ...f, santander: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingApertura(false)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                                <button onClick={saveApertura} className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase">Guardar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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

function PaymentRow({ label, amount, percentage, icon: Icon, color, textColor, bgColor, onClick }: any) {
    return (
        <div className="group cursor-pointer" onClick={onClick}>
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
