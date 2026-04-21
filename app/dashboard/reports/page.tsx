"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
    CreditCard, Wallet, Loader2, TrendingDown, TrendingUp,
    Scale, Smartphone, ArrowRightLeft, Receipt, Lightbulb, Flame, Home, ShoppingCart,
} from "lucide-react";

type Stats = { cash: number; card: number; mercadoPago: number; transfer: number; total: number; count: number };
type ExpenseRow = { amount: number; category: string; description: string };

const EXPENSE_ICON: Record<string, React.ReactNode> = {
    Luz: <Lightbulb size={16} />,
    Gas: <Flame size={16} />,
    Alquiler: <Home size={16} />,
    Mercadería: <ShoppingCart size={16} />,
};

function expenseIcon(cat: string) {
    return EXPENSE_ICON[cat] ?? <Receipt size={16} />;
}

type Timeframe = "DAY" | "WEEK" | "MONTH";

const TABS: { key: Timeframe; label: string }[] = [
    { key: "DAY",   label: "Hoy" },
    { key: "WEEK",  label: "Semana" },
    { key: "MONTH", label: "Mes" },
];

function startDate(tf: Timeframe): { ordersFrom: string; expensesFrom: string } {
    const now = new Date();
    if (tf === "DAY") {
        const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sodStr = sod.toISOString().split("T")[0];
        return { ordersFrom: sod.toISOString(), expensesFrom: sodStr };
    }
    const days = tf === "WEEK" ? 7 : 30;
    const from = new Date(now.getTime() - days * 86400000);
    return { ordersFrom: from.toISOString(), expensesFrom: from.toISOString().split("T")[0] };
}

function periodLabel(tf: Timeframe) {
    if (tf === "DAY") return new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    if (tf === "WEEK") return "Últimos 7 días";
    return "Últimos 30 días";
}

export default function ReportsPage() {
    const [timeframe, setTimeframe] = useState<Timeframe>("DAY");
    const [stats, setStats] = useState<Stats>({ cash: 0, card: 0, mercadoPago: 0, transfer: 0, total: 0, count: 0 });
    const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => { void fetchAll(); }, [timeframe]);

    async function fetchAll() {
        setLoading(true);
        const { ordersFrom, expensesFrom } = startDate(timeframe);

        const [{ data: orders }, { data: exps }] = await Promise.all([
            supabase.from("orders").select("total, payment_method").gte("created_at", ordersFrom),
            supabase.from("expenses").select("amount, category, description").gte("expense_date", expensesFrom),
        ]);

        if (orders) {
            const t = orders.reduce(
                (acc, o) => {
                    const amt = parseFloat(o.total);
                    if (o.payment_method === "CASH") acc.cash += amt;
                    else if (o.payment_method === "CARD") acc.card += amt;
                    else if (o.payment_method === "MERCADO_PAGO") acc.mercadoPago += amt;
                    else if (o.payment_method === "BANK_TRANSFER") acc.transfer += amt;
                    acc.total += amt;
                    return acc;
                },
                { cash: 0, card: 0, mercadoPago: 0, transfer: 0, total: 0, count: 0 }
            );
            t.count = orders.length;
            setStats(t);
        }

        setExpenses(exps ?? []);
        setLoading(false);
    }

    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    const balance = stats.total - totalExpenses;
    const isPositive = balance >= 0;

    const pct = (v: number) => (stats.total > 0 ? (v / stats.total) * 100 : 0);

    // Group expenses by category
    const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + parseFloat(String(e.amount));
        return acc;
    }, {});

    return (
        <div className="pb-20 space-y-10">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-gray-900">Control de Caja</h2>
                    <p className="text-gray-500 font-medium capitalize">{periodLabel(timeframe)}</p>
                </div>
                <div className="flex gap-1 bg-white/60 p-1.5 rounded-2xl border border-white/40 shadow-sm">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTimeframe(key)}
                            className={`px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                timeframe === key ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-gray-700"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Calculando...</p>
                </div>
            ) : (
                <>
                    {/* ── KPI BALANCE ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Ventas */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] p-7 flex flex-col gap-3"
                        >
                            <div className="flex items-center gap-2 text-emerald-700">
                                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <TrendingUp size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Ventas</span>
                            </div>
                            <p className="text-4xl font-black text-gray-900 tracking-tight">
                                ${stats.total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-emerald-600 font-bold">{stats.count} venta{stats.count !== 1 ? "s" : ""}</p>
                        </motion.div>

                        {/* Gastos */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-red-50 border-2 border-red-200 rounded-[2rem] p-7 flex flex-col gap-3"
                        >
                            <div className="flex items-center gap-2 text-red-700">
                                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                                    <TrendingDown size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Gastos</span>
                            </div>
                            <p className="text-4xl font-black text-gray-900 tracking-tight">
                                ${totalExpenses.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-red-500 font-bold">{expenses.length} registro{expenses.length !== 1 ? "s" : ""}</p>
                        </motion.div>

                        {/* Balance neto */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`rounded-[2rem] p-7 flex flex-col gap-3 border-2 ${
                                isPositive
                                    ? "bg-gray-900 border-gray-800"
                                    : "bg-red-900 border-red-800"
                            }`}
                        >
                            <div className="flex items-center gap-2 text-white/60">
                                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Scale size={18} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Balance neto</span>
                            </div>
                            <p className={`text-4xl font-black tracking-tight ${isPositive ? "text-emerald-400" : "text-red-300"}`}>
                                {isPositive ? "+" : ""}${balance.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-xs font-bold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                                {isPositive ? "Día en positivo ✓" : "Gastos superan ventas"}
                            </p>
                        </motion.div>
                    </div>

                    {/* ── DETALLE VENTAS ── */}
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 shadow-xl p-8 space-y-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Ventas por método de pago</p>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Efectivo",     value: stats.cash,        icon: <Wallet size={16} />,         color: "text-emerald-600", bar: "bg-emerald-500" },
                                { label: "Tarjeta",      value: stats.card,        icon: <CreditCard size={16} />,     color: "text-blue-600",    bar: "bg-blue-500" },
                                { label: "Mercado Pago", value: stats.mercadoPago, icon: <Smartphone size={16} />,     color: "text-cyan-600",    bar: "bg-cyan-500" },
                                { label: "Transferencia",value: stats.transfer,    icon: <ArrowRightLeft size={16} />, color: "text-violet-600",  bar: "bg-violet-500" },
                            ].map(({ label, value, icon, color, bar }) => (
                                <div key={label} className="space-y-3">
                                    <div className={`flex items-center gap-2 ${color}`}>
                                        {icon}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">
                                        ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                    </p>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct(value)}%` }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                            className={`h-full ${bar}`}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold">{pct(value).toFixed(1)}%</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── DETALLE GASTOS ── */}
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 shadow-xl p-8 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Gastos del período</p>
                            <span className="text-sm font-black text-red-600">
                                -${totalExpenses.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </span>
                        </div>

                        {expenses.length === 0 ? (
                            <div className="py-10 text-center text-gray-300">
                                <Receipt size={36} className="mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">Sin gastos registrados en este período</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Por categoría */}
                                {Object.entries(expensesByCategory).map(([cat, total]) => {
                                    const pctExp = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                                    return (
                                        <div key={cat} className="flex items-center gap-4">
                                            <div className="w-9 h-9 bg-red-50 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                                                {expenseIcon(cat)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-bold text-gray-700">{cat}</span>
                                                    <span className="text-sm font-black text-red-600">
                                                        -${total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-red-50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pctExp}%` }}
                                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                                        className="h-full bg-red-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Listado individual */}
                                <div className="pt-4 border-t border-gray-100 space-y-2">
                                    {expenses.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between py-1.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
                                                    {e.category}
                                                </span>
                                                <span className="text-sm text-gray-600 truncate">{e.description}</span>
                                            </div>
                                            <span className="text-sm font-black text-red-500 shrink-0 ml-3">
                                                -${parseFloat(String(e.amount)).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
