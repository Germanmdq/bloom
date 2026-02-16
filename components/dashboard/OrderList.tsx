"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/types";
import * as XLSX from "xlsx";
import { Loader2, Receipt, Calendar, CreditCard, Banknote, Smartphone, ChevronRight, X, Filter, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ViewMode = 'day' | 'week' | 'fortnight' | 'month';

interface GroupedData {
    id: string;
    label: string;
    subLabel?: string;
    orders: Order[];
    total: number;
    count: number;
    date: Date; // For sorting
}

export function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        try {
            const response = await fetch('/api/orders/list');
            const result = await response.json();

            if (response.ok && result.data) {
                setOrders(result.data as Order[]);
            } else {
                console.error("Failed to fetch orders via API:", result.error);
                // Fallback to client-side just in case? Or error toast.
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    const exportToExcel = () => {
        if (orders.length === 0) return;

        const detailRows: any[] = [];
        let grandTotal = 0;

        orders.forEach((order: any) => {
            const date = new Date(order.created_at);
            const dateStr = date.toLocaleDateString("es-AR");
            const timeStr = date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
            const items = order.items || [];

            // Add to Grand Total
            grandTotal += Number(order.total);

            if (Array.isArray(items) && items.length > 0) {
                items.forEach((item: any) => {
                    detailRows.push({
                        "Fecha": dateStr,
                        "Hora": timeStr,
                        "Mesa": order.table_id,
                        "Orden #": order.id.slice(0, 8),
                        "Método Pago": getPaymentLabel(order.payment_method),
                        "Producto": item.name,
                        "Cantidad": item.quantity || 1,
                        "Precio Unit.": item.price || 0,
                        "Subtotal Item": (item.price || 0) * (item.quantity || 1)
                    });
                });
            } else {
                detailRows.push({
                    "Fecha": dateStr,
                    "Hora": timeStr,
                    "Mesa": order.table_id,
                    "Orden #": order.id.slice(0, 8),
                    "Método Pago": getPaymentLabel(order.payment_method),
                    "Producto": "Venta General",
                    "Cantidad": 1,
                    "Precio Unit.": order.total,
                    "Subtotal Item": order.total
                });
            }
        });

        // Summary Rows (e.g. Total by Payment Method)
        const summaryByMethod = orders.reduce((acc: any, curr: any) => {
            const method = getPaymentLabel(curr.payment_method);
            acc[method] = (acc[method] || 0) + Number(curr.total);
            return acc;
        }, {});

        const summaryRows = [
            { "Concepto": "TOTAL FACTURADO", "Monto": grandTotal }, // Empty row for spacing
            { "Concepto": "", "Monto": "" },
            ...Object.keys(summaryByMethod).map(method => ({
                "Concepto": `Total ${method}`,
                "Monto": summaryByMethod[method]
            })),
            { "Concepto": "", "Monto": "" },
            { "Concepto": "Cantidad de Órdenes", "Monto": orders.length }
        ];

        const workbook = XLSX.utils.book_new();

        // Sheet 1: Resumen
        const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen General");

        // Sheet 2: Detalle (with footer total)
        detailRows.push({}); // Space
        detailRows.push({ "Producto": "TOTAL GENERAL", "Subtotal Item": grandTotal });

        const detailSheet = XLSX.utils.json_to_sheet(detailRows);

        // Auto-width columns roughly
        const wscols = [
            { wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 15 },
            { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 }
        ];
        detailSheet['!cols'] = wscols;

        XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle de Items");

        // Filename: Reporte_Bloom_dia_mes.xlsx
        const today = new Date();
        const niceDate = today.toLocaleDateString('es-AR').replace(/\//g, '-');
        XLSX.writeFile(workbook, `Reporte_Bloom_${niceDate}.xlsx`);
    };

    // GROUPING LOGIC
    const groupedOrders = useMemo(() => {
        const groups: Record<string, GroupedData> = {};

        orders.forEach(order => {
            const date = new Date(order.created_at);
            let key = "";
            let label = "";
            let subLabel = "";

            if (viewMode === 'day') {
                key = date.toLocaleDateString("es-AR"); // DD/MM/YYYY
                label = date.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long' });
                subLabel = date.toLocaleDateString("es-AR", { year: 'numeric' });
            } else if (viewMode === 'week') {
                // Simple Week Number
                const firstDay = new Date(date.getFullYear(), 0, 1);
                const pastDays = (date.getTime() - firstDay.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
                key = `${date.getFullYear()}-W${weekNum}`;
                label = `Semana ${weekNum}`;
                subLabel = `${date.getFullYear()}`;
            } else if (viewMode === 'fortnight') {
                const day = date.getDate();
                const fortnight = day <= 15 ? "1ra" : "2da";
                key = `${date.getFullYear()}-${date.getMonth()}-${fortnight}`;
                label = `${fortnight} Quincena de ${date.toLocaleDateString("es-AR", { month: 'long' })}`;
                subLabel = `${date.getFullYear()}`;
            } else if (viewMode === 'month') {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleDateString("es-AR", { month: 'long' });
                subLabel = `${date.getFullYear()}`;
            }

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    label,
                    subLabel,
                    orders: [],
                    total: 0,
                    count: 0,
                    date: date // Store first found date for sorting
                };
            }

            groups[key].orders.push(order);
            groups[key].total += Number(order.total);
            groups[key].count += 1;
        });

        // Convert to array and sort by date descending
        return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [orders, viewMode]);


    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'CASH': return <Banknote size={16} className="text-green-600" />;
            case 'CARD': return <CreditCard size={16} className="text-blue-600" />;
            case 'MERCADO_PAGO': return <Smartphone size={16} className="text-sky-500" />;
            default: return <Receipt size={16} className="text-gray-400" />;
        }
    };

    const getPaymentLabel = (method: string) => {
        switch (method) {
            case 'CASH': return 'Efectivo';
            case 'CARD': return 'Tarjeta';
            case 'MERCADO_PAGO': return 'Mercado Pago';
            default: return method;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="animate-spin text-[#FFD60A]" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando historial...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* CONTROLS */}
            <div className="flex flex-wrap gap-4 items-center mb-8">
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-wrap gap-2 w-fit">
                    {(['day', 'week', 'fortnight', 'month'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${viewMode === mode
                                ? "bg-[#FFD60A] text-black shadow-md"
                                : "bg-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                                }`}
                        >
                            {mode === 'day' && 'Día'}
                            {mode === 'week' && 'Semana'}
                            {mode === 'fortnight' && 'Quincena'}
                            {mode === 'month' && 'Mes'}
                        </button>
                    ))}
                </div>

                <button
                    onClick={exportToExcel}
                    className="ml-auto flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg transition-transform active:scale-95"
                >
                    <Download size={18} />
                    <span>Exportar Excel</span>
                </button>
            </div>

            {/* GRID OF GROUPS */}
            {groupedOrders.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Filter size={48} className="mx-auto mb-4" />
                    <p className="font-bold">No hay ordenes para mostrar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupedOrders.map((group, idx) => (
                        <motion.button
                            key={group.id}
                            layoutId={`card-${group.id}`}
                            onClick={() => setSelectedGroup(group)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Calendar size={100} className="transform rotate-12" />
                            </div>

                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-[#FFD60A] uppercase tracking-widest mb-2 bg-black w-fit px-2 py-1 rounded-md">
                                    {group.subLabel}
                                </p>
                                <h3 className="text-xl font-black text-gray-900 capitalize leading-tight mb-6">
                                    {group.label}
                                </h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Ventas</span>
                                        <span className="text-2xl font-black text-gray-900">${group.total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Ordenes</span>
                                        <span className="text-sm font-bold text-gray-600">{group.count}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedGroup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedGroup(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            layoutId={`card-${selectedGroup.id}`}
                            className="bg-[#F8F9FA] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="bg-[#FFD60A] p-8 flex justify-between items-start shrink-0">
                                <div>
                                    <p className="text-xs font-black text-black/50 uppercase tracking-widest mb-1">{selectedGroup.subLabel}</p>
                                    <h2 className="text-3xl font-black text-black capitalize">{selectedGroup.label}</h2>
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="bg-black text-white px-4 py-2 rounded-xl flex flex-col pointer-events-none">
                                            <span className="text-[9px] font-black uppercase opacity-60">Total Facturado</span>
                                            <span className="text-xl font-black">${selectedGroup.total.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white/50 text-black px-4 py-2 rounded-xl flex flex-col pointer-events-none">
                                            <span className="text-[9px] font-black uppercase opacity-60">Ordenes</span>
                                            <span className="text-xl font-black">{selectedGroup.count}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="w-10 h-10 rounded-full bg-black/10 hover:bg-black hover:text-white transition-colors flex items-center justify-center"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content - List */}
                            <div className="flex-1 overflow-y-auto p-8">
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-[#F8F9FA] z-10">
                                        <tr>
                                            <th className="pb-4 pl-4 rounded-tl-xl">Hora</th>
                                            <th className="pb-4">Mesa</th>
                                            <th className="pb-4">Método</th>
                                            <th className="pb-4 text-right pr-4 rounded-tr-xl">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold text-gray-700">
                                        {selectedGroup.orders.map((order) => (
                                            <tr key={order.id} className="border-b border-gray-200/50 hover:bg-white transition-colors group">
                                                <td className="py-4 pl-4 rounded-l-xl group-hover:bg-white text-gray-500">
                                                    {new Date(order.created_at).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-4 group-hover:bg-white">
                                                    <span className="bg-black text-white px-2 py-1 rounded flex items-center justify-center text-xs font-black w-fit whitespace-nowrap">
                                                        {order.table_id}
                                                    </span>
                                                </td>
                                                <td className="py-4 group-hover:bg-white">
                                                    <div className="flex items-center gap-2">
                                                        {getPaymentIcon(order.payment_method)}
                                                        <span>{getPaymentLabel(order.payment_method)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right pr-4 rounded-r-xl group-hover:bg-white font-black text-gray-900">
                                                    ${Number(order.total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
