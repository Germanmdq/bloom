"use client";

import { useEffect, useState, useMemo } from "react";
import { Order } from "@/lib/types";
import * as XLSX from "xlsx";
import { Loader2, Calendar, X, Filter, Download, Bike, Store, Building2, UtensilsCrossed } from "lucide-react";
import { getPaymentIcon, getPaymentLabel } from "@/lib/utils/payment";
import { motion, AnimatePresence } from "framer-motion";

type ViewMode = 'day' | 'week' | 'fortnight' | 'month';

interface GroupedData {
    id: string;
    label: string;
    subLabel?: string;
    orders: Order[];
    total: number;
    count: number;
    date: Date;
}

function orderTypeLabel(order: any) {
    const t = order.delivery_type || order.order_type;
    if (t === "tribunales") return { label: "Tribunales", icon: <Building2 size={13} /> };
    if (t === "delivery")   return { label: "Delivery",   icon: <Bike size={13} /> };
    if (t === "retiro")     return { label: "Retiro",     icon: <Store size={13} /> };
    if (order.table_id)     return { label: `Mesa ${order.table_id}`, icon: <UtensilsCrossed size={13} /> };
    return { label: "Web", icon: <Store size={13} /> };
}

export function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    useEffect(() => { fetchOrders(); }, []);

    async function fetchOrders() {
        setLoading(true);
        try {
            const res = await fetch('/api/orders/list');
            const result = await res.json();
            if (res.ok && result.data) setOrders(result.data as Order[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const exportToExcel = () => {
        if (orders.length === 0) return;
        const rows: any[] = [];
        let grandTotal = 0;
        orders.forEach((order: any) => {
            const date = new Date(order.created_at);
            grandTotal += Number(order.total);
            const items = order.items || [];
            if (Array.isArray(items) && items.length > 0) {
                items.forEach((item: any) => {
                    rows.push({
                        "Fecha": date.toLocaleDateString("es-AR"),
                        "Hora": date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' }),
                        "Cliente": order.customer_name || `Mesa ${order.table_id}`,
                        "Tipo": orderTypeLabel(order).label,
                        "Método Pago": getPaymentLabel(order.payment_method),
                        "Producto": item.name,
                        "Cantidad": item.quantity || 1,
                        "Precio": item.price || 0,
                        "Subtotal": (item.price || 0) * (item.quantity || 1),
                    });
                });
            } else {
                rows.push({
                    "Fecha": date.toLocaleDateString("es-AR"),
                    "Hora": date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' }),
                    "Cliente": order.customer_name || `Mesa ${order.table_id}`,
                    "Tipo": orderTypeLabel(order).label,
                    "Método Pago": getPaymentLabel(order.payment_method),
                    "Producto": "Venta General", "Cantidad": 1,
                    "Precio": order.total, "Subtotal": order.total,
                });
            }
        });
        const wb = XLSX.utils.book_new();
        rows.push({}, { "Producto": "TOTAL", "Subtotal": grandTotal });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Pedidos");
        XLSX.writeFile(wb, `Bloom_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
    };

    const groupedOrders = useMemo(() => {
        const groups: Record<string, GroupedData> = {};
        orders.forEach(order => {
            const date = new Date(order.created_at);
            let key = "", label = "", subLabel = "";
            if (viewMode === 'day') {
                key = date.toLocaleDateString("es-AR");
                label = date.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long' });
                subLabel = String(date.getFullYear());
            } else if (viewMode === 'week') {
                const first = new Date(date.getFullYear(), 0, 1);
                const wn = Math.ceil(((date.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
                key = `${date.getFullYear()}-W${wn}`; label = `Semana ${wn}`; subLabel = String(date.getFullYear());
            } else if (viewMode === 'fortnight') {
                const fn = date.getDate() <= 15 ? "1ra" : "2da";
                key = `${date.getFullYear()}-${date.getMonth()}-${fn}`;
                label = `${fn} Quincena de ${date.toLocaleDateString("es-AR", { month: 'long' })}`;
                subLabel = String(date.getFullYear());
            } else {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleDateString("es-AR", { month: 'long' });
                subLabel = String(date.getFullYear());
            }
            if (!groups[key]) groups[key] = { id: key, label, subLabel, orders: [], total: 0, count: 0, date };
            groups[key].orders.push(order);
            groups[key].total += Number(order.total);
            groups[key].count += 1;
        });
        return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [orders, viewMode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-[#FFD60A]" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando historial...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* CONTROLS */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-1 flex-wrap">
                    {(['day', 'week', 'fortnight', 'month'] as ViewMode[]).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${viewMode === mode ? "bg-[#FFD60A] text-black shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                        >
                            {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes'}
                        </button>
                    ))}
                </div>
                <button onClick={exportToExcel}
                    className="ml-auto flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow transition-all active:scale-95"
                >
                    <Download size={16} /> Excel
                </button>
            </div>

            {/* GRID */}
            {groupedOrders.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Filter size={48} className="mx-auto mb-4" />
                    <p className="font-bold">No hay órdenes para mostrar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupedOrders.map((group, idx) => (
                        <motion.button key={group.id} layoutId={`card-${group.id}`}
                            onClick={() => setSelectedGroup(group)}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left"
                        >
                            <p className="text-[10px] font-black text-[#FFD60A] uppercase tracking-widest mb-1.5 bg-black w-fit px-2 py-0.5 rounded-md">
                                {group.subLabel}
                            </p>
                            <h3 className="text-lg font-black text-gray-900 capitalize leading-tight mb-4">{group.label}</h3>
                            <div className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Ventas</span>
                                    <span className="text-2xl font-black text-gray-900">${group.total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Órdenes</span>
                                    <span className="text-sm font-bold text-gray-600">{group.count}</span>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* DETAIL MODAL — group */}
            <AnimatePresence>
                {selectedGroup && !selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedGroup(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div layoutId={`card-${selectedGroup.id}`}
                            className="bg-white w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-[#FFD60A] px-5 py-5 sm:px-8 sm:py-7 flex justify-between items-start shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-0.5">{selectedGroup.subLabel}</p>
                                    <h2 className="text-xl sm:text-3xl font-black text-black capitalize leading-tight">{selectedGroup.label}</h2>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="bg-black text-white px-3 py-1.5 rounded-xl">
                                            <p className="text-[9px] font-black uppercase opacity-60">Total</p>
                                            <p className="text-lg font-black">${selectedGroup.total.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/60 px-3 py-1.5 rounded-xl">
                                            <p className="text-[9px] font-black uppercase opacity-60">Órdenes</p>
                                            <p className="text-lg font-black">{selectedGroup.count}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedGroup(null)}
                                    className="w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white transition-colors flex items-center justify-center shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Lista de pedidos */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
                                {selectedGroup.orders.map(order => {
                                    const o = order as any;
                                    const { label: typeLabel, icon: typeIcon } = orderTypeLabel(o);
                                    const time = new Date(o.created_at).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <button key={o.id} onClick={() => setSelectedOrder(o)}
                                            className="w-full bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl px-4 py-3 text-left transition-all flex items-center gap-3"
                                        >
                                            <div className="text-gray-400 shrink-0">{typeIcon}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-gray-900 text-sm truncate">
                                                    {o.customer_name || `Mesa ${o.table_id}`}
                                                </p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                    <span>{time}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span>{typeLabel}</span>
                                                    {o.customer_phone && (
                                                        <>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                            <span>{o.customer_phone}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="font-black text-gray-900 text-base shrink-0">${Number(o.total).toLocaleString()}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL MODAL — single order */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedOrder(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            className="bg-white w-full sm:max-w-md max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col"
                        >
                            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                                <div>
                                    <p className="font-black text-gray-900 text-lg">{selectedOrder.customer_name || `Mesa ${selectedOrder.table_id}`}</p>
                                    {selectedOrder.customer_phone && (
                                        <a href={`tel:${selectedOrder.customer_phone}`} className="text-sm text-bloom-600 font-bold">{selectedOrder.customer_phone}</a>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                            {orderTypeLabel(selectedOrder).icon} {orderTypeLabel(selectedOrder).label}
                                        </span>
                                        {selectedOrder.delivery_info && (
                                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg max-w-xs truncate">{selectedOrder.delivery_info}</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedOrder(null)}
                                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {(selectedOrder.items || []).length === 0 ? (
                                    <p className="text-gray-400 text-sm">Sin detalle de items</p>
                                ) : (
                                    (selectedOrder.items as any[]).map((item: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-sm">{item.quantity > 1 && <span className="text-bloom-600 font-black">{item.quantity}x </span>}{item.name}</p>
                                                {item.variants?.length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{item.variants.join(", ")}</p>
                                                )}
                                                {item.observations && (
                                                    <p className="text-xs text-gray-400 italic">"{item.observations}"</p>
                                                )}
                                            </div>
                                            <p className="text-sm font-black text-gray-700 shrink-0">${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <p className="text-xs text-gray-400">{new Date(selectedOrder.created_at).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                    {selectedOrder.payment_method && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {getPaymentIcon(selectedOrder.payment_method)}
                                            <span className="text-xs font-bold text-gray-500">{getPaymentLabel(selectedOrder.payment_method)}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-2xl font-black text-gray-900">${Number(selectedOrder.total).toLocaleString()}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
