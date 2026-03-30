"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Order } from "@/lib/types";
import * as XLSX from "xlsx";
import { Loader2, X, Filter, Download, Bike, Store, Building2, UtensilsCrossed, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
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

function isOrderPaid(o: Order & { paid?: boolean | null }) {
    return Boolean(o.paid);
}

function isDeliveryOrder(o: Order & { delivery_type?: string | null }) {
    return String(o.delivery_type ?? "").toLowerCase() === "delivery";
}

/** Canal visual: delivery > mesa POS > retiro (web local / sucursal). */
type OrderChannel = "mesa" | "delivery" | "retiro";

function getOrderChannel(order: Order): OrderChannel {
    const dt = String(order.delivery_type ?? "").toLowerCase();
    const ot = String(order.order_type ?? "").toLowerCase();
    if (dt === "delivery") return "delivery";
    /** Mesa: comanda con mesa (p. ej. POS); pedidos web usan `order_type` web y suelen ir sin mesa. */
    if (order.table_id != null && ot !== "web") return "mesa";
    return "retiro";
}

/** Borde izquierdo grueso + color (el resto del borde viene de paid/unpaid). */
const CHANNEL_LEFT: Record<OrderChannel, string> = {
    mesa: "border-l-4 border-l-red-500",
    delivery: "border-l-4 border-l-green-500",
    retiro: "border-l-4 border-l-amber-400",
};

const CHANNEL_BADGE: Record<OrderChannel, string> = {
    mesa: "bg-red-500 text-white",
    delivery: "bg-green-600 text-white",
    retiro: "bg-amber-400 text-gray-900",
};

const CHANNEL_LABEL: Record<OrderChannel, string> = {
    mesa: "Mesa",
    delivery: "Delivery",
    retiro: "Retiro",
};

export function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [unpaidOnly, setUnpaidOnly] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);

    const fetchOrders = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent === true;
        if (!silent) {
            setLoading(true);
            setFetchError(null);
        }
        try {
            const res = await fetch("/api/orders/list", { credentials: "include" });
            const result = await res.json();
            console.log(
                "[OrderList] status:",
                res.status,
                "orders:",
                result.data?.length,
                "error:",
                result.error
            );
            if (!res.ok) {
                const msg =
                    typeof result.error === "string"
                        ? result.error
                        : res.status === 401
                          ? "Sesión inválida o no sos el admin del panel."
                          : `No se pudieron cargar los pedidos (${res.status}).`;
                setOrders([]);
                setFetchError(msg);
                console.error("[OrderList] /api/orders/list", res.status, result);
                return;
            }
            setOrders(Array.isArray(result.data) ? (result.data as Order[]) : []);
            setFetchError(null);
        } catch (e) {
            console.error(e);
            setOrders([]);
            setFetchError("Error de red al cargar pedidos.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchOrders();
        const interval = setInterval(() => void fetchOrders({ silent: true }), 30000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    async function setOrderPaid(orderId: string, paid: boolean) {
        setTogglingId(orderId);
        try {
            const res = await fetch("/api/orders/paid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, paid }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                console.error(j);
                return;
            }
            await fetchOrders();
        } finally {
            setTogglingId(null);
        }
    }

    function patchOrderDeliveryPerson(orderId: string, delivery_person_id: number | null) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, delivery_person_id } : o))
        );
        setSelectedOrder((prev) =>
            prev?.id === orderId ? { ...prev, delivery_person_id } : prev
        );
        setSelectedGroup((prev) =>
            prev
                ? {
                      ...prev,
                      orders: prev.orders.map((o) =>
                          o.id === orderId ? { ...o, delivery_person_id } : o
                      ),
                  }
                : null
        );
    }

    async function setDeliveryPerson(orderId: string, delivery_person_id: number | null) {
        setAssigningDeliveryId(orderId);
        try {
            const res = await fetch("/api/orders/delivery-person", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, delivery_person_id }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                console.error(j);
                return;
            }
            patchOrderDeliveryPerson(orderId, delivery_person_id);
            await fetchOrders();
        } finally {
            setAssigningDeliveryId(null);
        }
    }

    const unpaidSummary = useMemo(() => {
        const unpaid = orders.filter((o) => !isOrderPaid(o as Order & { paid?: boolean }));
        const total = unpaid.reduce((s, o) => s + Number(o.total), 0);
        return { count: unpaid.length, total };
    }, [orders]);

    const visibleOrders = useMemo(
        () => (unpaidOnly ? orders.filter((o) => !isOrderPaid(o as Order & { paid?: boolean })) : orders),
        [orders, unpaidOnly]
    );

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
        visibleOrders.forEach(order => {
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
    }, [visibleOrders, viewMode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-[#FFD60A]" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando historial...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="rounded-3xl border-2 border-red-200 bg-red-50/90 p-6 space-y-3">
                <p className="font-black text-red-900">No se pudo cargar el historial</p>
                <p className="text-sm text-red-800 leading-relaxed">{fetchError}</p>
                <button
                    type="button"
                    onClick={() => void fetchOrders()}
                    className="rounded-xl bg-red-900 text-white px-4 py-2 text-sm font-bold hover:bg-red-800"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumen impagos */}
            <div className={`rounded-3xl border-2 p-5 flex flex-wrap items-center justify-between gap-4 ${unpaidSummary.count > 0 ? "border-amber-400 bg-amber-50/90" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${unpaidSummary.count > 0 ? "bg-amber-200 text-amber-900" : "bg-gray-100 text-gray-500"}`}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cuentas por cobrar</p>
                        <p className="text-xl font-black text-gray-900">
                            {unpaidSummary.count} pedido{unpaidSummary.count === 1 ? "" : "s"} impago{unpaidSummary.count === 1 ? "" : "s"}
                        </p>
                        <p className="text-sm font-bold text-amber-800">
                            Total: <span className="text-lg">${unpaidSummary.total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setUnpaidOnly((v) => !v)}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wide transition-all ${unpaidOnly ? "bg-black text-[#FFD60A]" : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300"}`}
                >
                    {unpaidOnly ? "Ver todos" : "Ver solo impagos"}
                </button>
            </div>

            {/* Leyenda de canales */}
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Leyenda</p>
                <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-black text-gray-800 leading-relaxed">
                    <span>🔴 Mesa</span>
                    <span>🟢 Delivery</span>
                    <span>🟡 Retiro en sucursal</span>
                </p>
            </div>

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
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchOrders({ silent: true })}
                        className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95"
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                    <button onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow transition-all active:scale-95"
                    >
                        <Download size={16} /> Excel
                    </button>
                </div>
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
                                    const o = order as Order & { paid?: boolean };
                                    const paid = isOrderPaid(o);
                                    const channel = getOrderChannel(o);
                                    const chLeft = CHANNEL_LEFT[channel];
                                    const chBadge = CHANNEL_BADGE[channel];
                                    const chShort = CHANNEL_LABEL[channel];
                                    const { label: typeLabel, icon: typeIcon } = orderTypeLabel(o);
                                    const time = new Date(o.created_at).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
                                    const frame = paid
                                        ? "border-2 border-gray-200 bg-gray-50"
                                        : "border-2 border-amber-400 bg-amber-50/50";
                                    return (
                                        <div
                                            key={o.id}
                                            className={`rounded-2xl transition-all flex flex-col gap-2 p-1 shadow-sm ${frame} ${chLeft}`}
                                        >
                                            <button type="button" onClick={() => setSelectedOrder(o)}
                                                className="w-full hover:bg-white/80 rounded-xl px-3 py-2 text-left flex items-center gap-3"
                                            >
                                                <span
                                                    className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm ${chBadge}`}
                                                    title={chShort}
                                                >
                                                    {chShort}
                                                </span>
                                                <div className="text-gray-400 shrink-0">{typeIcon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-gray-900 text-sm truncate">
                                                        {o.customer_name || `Mesa ${o.table_id}`}
                                                    </p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        <span>{time}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span>{typeLabel}</span>
                                                        {o.customer_phone && (
                                                            <>
                                                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                <span>{o.customer_phone}</span>
                                                            </>
                                                        )}
                                                        <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-200 text-amber-900"}`}>
                                                            {paid ? "Pagado" : "Impago"}
                                                        </span>
                                                    </p>
                                                </div>
                                                <p className="font-black text-gray-900 text-base shrink-0">${Number(o.total).toLocaleString()}</p>
                                            </button>
                                            <div className="flex flex-col items-stretch gap-2 px-2 pb-2 sm:flex-row sm:items-center sm:justify-end">
                                                {isDeliveryOrder(o) && (
                                                    <div className="flex items-center gap-2 sm:mr-auto">
                                                        <label className="text-[10px] font-black uppercase text-gray-500 shrink-0">
                                                            Repartidor
                                                        </label>
                                                        <select
                                                            value={
                                                                o.delivery_person_id != null
                                                                    ? String(o.delivery_person_id)
                                                                    : ""
                                                            }
                                                            disabled={assigningDeliveryId === o.id}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                const v = e.target.value;
                                                                void setDeliveryPerson(
                                                                    o.id,
                                                                    v === "" ? null : Number(v)
                                                                );
                                                            }}
                                                            className="text-xs font-bold rounded-xl border border-gray-200 bg-white px-2 py-1.5 min-w-[7rem]"
                                                        >
                                                            <option value="">Sin asignar</option>
                                                            {[1, 2, 3, 4, 5].map((n) => (
                                                                <option key={n} value={n}>
                                                                    {n}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={togglingId === o.id}
                                                    onClick={(e) => { e.stopPropagation(); void setOrderPaid(o.id, !paid); }}
                                                    className={`inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-xl transition-all ${paid ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                                                >
                                                    {togglingId === o.id ? <Loader2 className="animate-spin" size={14} /> : paid ? <><AlertCircle size={14} /> Marcar impago</> : <><CheckCircle2 size={14} /> Marcar pagado</>}
                                                </button>
                                            </div>
                                        </div>
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
                            className={`bg-white w-full sm:max-w-md max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col border-2 border-gray-200 ${CHANNEL_LEFT[getOrderChannel(selectedOrder)]}`}
                        >
                            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                                <div>
                                    <span
                                        className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide mb-2 ${CHANNEL_BADGE[getOrderChannel(selectedOrder)]}`}
                                    >
                                        {CHANNEL_LABEL[getOrderChannel(selectedOrder)]}
                                    </span>
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
                                                    <p className="text-xs text-gray-400 italic">
                                                        {`\u201C${item.observations}\u201D`}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-sm font-black text-gray-700 shrink-0">${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex flex-col gap-3 bg-gray-50">
                                <div className="flex justify-between items-center">
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
                                <div className="flex flex-col gap-3">
                                    {isDeliveryOrder(selectedOrder as Order) && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-gray-500">
                                                Repartidor
                                            </span>
                                            <select
                                                value={
                                                    selectedOrder.delivery_person_id != null
                                                        ? String(selectedOrder.delivery_person_id)
                                                        : ""
                                                }
                                                disabled={assigningDeliveryId === selectedOrder.id}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    void setDeliveryPerson(
                                                        selectedOrder.id,
                                                        v === "" ? null : Number(v)
                                                    );
                                                }}
                                                className="text-xs font-bold rounded-xl border border-gray-200 bg-white px-2 py-2 min-w-[8rem]"
                                            >
                                                <option value="">Sin asignar</option>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${isOrderPaid(selectedOrder) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                                        {isOrderPaid(selectedOrder) ? "Pagado" : "Pendiente de cobro"}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={togglingId === selectedOrder.id}
                                        onClick={() => void setOrderPaid(selectedOrder.id, !isOrderPaid(selectedOrder))}
                                        className={`text-xs font-black uppercase px-3 py-2 rounded-xl ${isOrderPaid(selectedOrder) ? "bg-amber-200 text-amber-950" : "bg-emerald-600 text-white"}`}
                                    >
                                        {togglingId === selectedOrder.id ? "…" : isOrderPaid(selectedOrder) ? "Marcar impago" : "Marcar pagado"}
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
