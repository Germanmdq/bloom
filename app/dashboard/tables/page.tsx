"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Table, TableStatus } from "@/lib/types";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type WebOrder = {
    id: string;
    customer_name: string;
    customer_phone: string;
    delivery_type: string;
    delivery_info: string;
    items: any[];
    total: number;
    status: string;
    created_at: string;
};

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Web orders state
    const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
    const [selectedWebOrder, setSelectedWebOrder] = useState<WebOrder | null>(null);

    // New Table Modal State
    const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
    const [newTableType, setNewTableType] = useState<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'>('LOCAL');
    const [newTableIdInput, setNewTableIdInput] = useState("");

    const supabase = createClient();

    useEffect(() => {
        fetchTables();
        fetchWebOrders();

        // Listen to salon_tables changes (POS tables)
        const tableChannel = supabase
            .channel('salon_tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_tables' }, () => {
                fetchTables();
            })
            .subscribe();

        // Listen to orders changes (web orders)
        const ordersChannel = supabase
            .channel('web_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchWebOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(tableChannel);
            supabase.removeChannel(ordersChannel);
        };
    }, []);

    async function fetchWebOrders() {
        try {
            // Only filter on columns that definitely exist (order_type, status)
            // Avoid filtering on 'paid' which may not exist in older DB schemas
            const { data, error } = await supabase
                .from('orders')
                .select('id, customer_name, customer_phone, delivery_type, delivery_info, items, total, status, created_at, order_type')
                .eq('order_type', 'web')
                .in('status', ['pending', 'pending_payment'])
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) {
                console.error('[TablesPage] fetchWebOrders error:', error.message);
                return;
            }
            if (data) setWebOrders(data as WebOrder[]);
        } catch (err: any) {
            console.error('[TablesPage] fetchWebOrders catch:', err.message);
        }
    }

    async function fetchTables() {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('salon_tables')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                setError(error.message);
            } else if (data) {
                setTables(data as Table[]);
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado');
        } finally {
            setLoading(false);
        }
    }

    const handleOrderComplete = () => {
        fetchTables();
    };

    const handleOpenTable = async (id?: number) => {
        let targetId = id || 0;
        const finalOrderType = newTableType;

        if (!id) {
            const parsed = parseInt(newTableIdInput);
            if (newTableType === 'LOCAL') {
                if (isNaN(parsed) || parsed < 1 || parsed > 99) {
                    alert("Por favor ingresa un número de mesa válido (1-99).");
                    return;
                }
                targetId = parsed;
            } else if (newTableType === 'DELIVERY') {
                if (!isNaN(parsed)) {
                    targetId = parsed;
                } else {
                    const freeDeliveryTables = tables
                        .filter(t => t.id >= 100 && t.id < 200 && t.status === 'FREE')
                        .sort((a, b) => a.id - b.id);
                    if (freeDeliveryTables.length > 0) {
                        targetId = freeDeliveryTables[0].id;
                    }
                }
            } else if (newTableType === 'TAKEAWAY') {
                if (!isNaN(parsed)) {
                    targetId = parsed;
                } else {
                    const freeTakeawayTables = tables
                        .filter(t => t.id >= 200 && t.id < 300 && t.status === 'FREE')
                        .sort((a, b) => a.id - b.id);
                    if (freeTakeawayTables.length > 0) {
                        targetId = freeTakeawayTables[0].id;
                    }
                }
            }
        }

        if (targetId === 0) {
            alert("No hay mesas libres (o creadas) en este rango.");
            return;
        }

        // Si la mesa ya está ocupada, simplemente la seleccionamos
        const existing = tables.find(t => t.id === targetId);
        if (existing && existing.status === 'OCCUPIED') {
            setSelectedTable(existing);
            setIsNewTableModalOpen(false);
            setNewTableIdInput("");
            return;
        }

        const { data, error } = await supabase
            .from('salon_tables')
            .update({ status: 'OCCUPIED', order_type: finalOrderType })
            .eq('id', targetId)
            .select()
            .single();

        if (error) {
            console.error("Error opening table:", error);
            alert("Hubo un error al abrir la mesa: " + error.message);
        } else {
            setIsNewTableModalOpen(false);
            setNewTableIdInput("");
            fetchTables();
            if (data) {
                setSelectedTable(data as Table);
            }
        }
    };

    const handleQuickOpen = (val: string) => {
        const num = parseInt(val);
        if (isNaN(num)) return;
        
        // Determinar tipo según rango
        if (num >= 1 && num < 100) setNewTableType('LOCAL');
        else if (num >= 100 && num < 200) setNewTableType('DELIVERY');
        else if (num >= 200 && num < 300) setNewTableType('TAKEAWAY');

        handleOpenTable(num);
    };

    const sortedTables = [...tables]
        .filter(t => t.status === 'OCCUPIED')
        .sort((a, b) => a.id - b.id);

    const getCardStyles = (table: Table) => {
        // Delivery range or Web Delivery (999)
        if ((table.id >= 100 && table.id < 200) || table.id === 999) {
            return {
                bg: 'bg-green-100/60 border-green-200/50 shadow-[0_10px_20px_rgba(34,197,94,0.15)]',
                dot: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]',
                badgeBg: 'bg-green-100 text-green-700',
                label: 'Delivery'
            };
        } 
        // Retiro range or Web Retiro (998)
        else if ((table.id >= 200 && table.id < 300) || table.id === 998) {
            return {
                bg: 'bg-yellow-100/60 border-yellow-200/50 shadow-[0_10px_20px_rgba(250,204,21,0.15)]',
                dot: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]',
                badgeBg: 'bg-yellow-100 text-yellow-700',
                label: 'Retiro'
            };
        }
        return {
            bg: 'bg-orange-100/60 border-orange-200/50 shadow-[0_10px_20px_rgba(249,115,22,0.15)]',
            dot: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]',
            badgeBg: 'bg-black/5 text-black/40',
            label: 'Local'
        };
    };

    return (
        <div className="relative min-h-full">
            {/* OrderSheet Overlay */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-3xl"
                        onClick={() => { setSelectedTable(null); fetchTables(); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200, opacity: { duration: 0.2 } }}
                        className="relative z-10 w-full h-full flex flex-col p-4 md:p-10"
                    >
                        <div className="bg-white/90 backdrop-blur-2xl w-full h-full rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col">
                            <OrderSheet
                                tableId={selectedTable.id}
                                onClose={() => { setSelectedTable(null); fetchTables(); }}
                                onOrderComplete={() => handleOrderComplete()}
                            />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* New Table Modal */}
            {isNewTableModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsNewTableModalOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <h3 className="text-2xl font-bold mb-6 text-gray-900">Abrir Nueva Mesa</h3>

                        <div className="space-y-4 mb-8">
                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-black has-[:checked]:bg-black/5">
                                <input
                                    type="radio" name="tableType" value="LOCAL"
                                    checked={newTableType === 'LOCAL'}
                                    onChange={() => setNewTableType('LOCAL')}
                                    className="w-5 h-5 accent-black"
                                />
                                <span className="font-bold text-gray-800">Mesa en Local</span>
                            </label>

                            <div className="pl-12 pr-4 pb-2">
                                <input
                                    autoFocus
                                    type="number"
                                    placeholder={
                                        newTableType === 'LOCAL' ? "Nº Mesa (1-99)" :
                                        newTableType === 'DELIVERY' ? "Nº Delivery (Opcional, 101+)" :
                                        "Nº Retiro (Opcional, 201+)"
                                    }
                                    value={newTableIdInput}
                                    onChange={(e) => setNewTableIdInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenTable(); }}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-black"
                                />
                            </div>

                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                <input
                                    type="radio" name="tableType" value="DELIVERY"
                                    checked={newTableType === 'DELIVERY'}
                                    onChange={() => setNewTableType('DELIVERY')}
                                    className="w-5 h-5 accent-green-600"
                                />
                                <span className="font-bold text-gray-800">Delivery</span>
                            </label>

                            <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all hover:border-black/20 has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50">
                                <input
                                    type="radio" name="tableType" value="TAKEAWAY"
                                    checked={newTableType === 'TAKEAWAY'}
                                    onChange={() => setNewTableType('TAKEAWAY')}
                                    className="w-5 h-5 accent-yellow-500"
                                />
                                <span className="font-bold text-gray-800">Retiro en Local</span>
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsNewTableModalOpen(false)}
                                className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleOpenTable()}
                                className="flex-1 py-4 font-bold text-white bg-black hover:scale-105 active:scale-95 rounded-2xl transition-all shadow-xl"
                            >
                                Abrir Mesa
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Salón</h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Mesa #"
                            className="w-24 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleQuickOpen(e.currentTarget.value);
                                    e.currentTarget.value = "";
                                }
                            }}
                        />
                        <button
                            onClick={() => setIsNewTableModalOpen(true)}
                            className="bg-black text-white px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            + Abrir Mesa
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" /> Local
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Delivery
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" /> Retiro
                    </div>
                </div>
            </div>

            {loading && tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Sincronizando salón...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Error de Conexión</p>
                    <p className="text-gray-500 text-sm max-w-md">{error}</p>
                    <button
                        onClick={() => fetchTables()}
                        className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            ) : sortedTables.length === 0 && webOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <span className="text-2xl opacity-50">🍽️</span>
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Salón Vacío</p>
                    <p className="text-gray-400 text-sm max-w-md">No hay mesas abiertas en este momento.</p>
                </div>
            ) : (
                (() => {
                    const totalItems = webOrders.length + sortedTables.length;
                    // Adapt columns & card size based on how many items are open
                    const gridCols =
                        totalItems <= 2 ? 'grid-cols-2' :
                        totalItems <= 4 ? 'grid-cols-2 sm:grid-cols-2' :
                        totalItems <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                        totalItems <= 9 ? 'grid-cols-3' :
                        totalItems <= 12 ? 'grid-cols-3 md:grid-cols-4' :
                        totalItems <= 16 ? 'grid-cols-4 md:grid-cols-4 lg:grid-cols-5' :
                        'grid-cols-4 md:grid-cols-5 lg:grid-cols-6';

                    return (
                        <div className={`grid ${gridCols} gap-3 lg:gap-4 auto-rows-fr`}
                            style={{ minHeight: 'calc(100vh - 180px)' }}>

                            {/* Web Orders */}
                            {webOrders.map((order) => {
                                const isDelivery = order.delivery_type === 'delivery';
                                return (
                                    <motion.div
                                        key={order.id}
                                        layoutId={`web-order-${order.id}`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedWebOrder(order)}
                                        className={`rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-2xl border border-white/40 ${
                                            isDelivery
                                                ? 'bg-green-100/60 border-green-200/50 shadow-[0_10px_20px_rgba(34,197,94,0.15)]'
                                                : 'bg-yellow-100/60 border-yellow-200/50 shadow-[0_10px_20px_rgba(250,204,21,0.15)]'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="text-xl font-black text-gray-900 truncate max-w-[80%]">
                                                {order.customer_name?.split(' ')[0] || 'Web'}
                                            </span>
                                            <div className={`w-3 h-3 rounded-full animate-pulse shrink-0 ${
                                                isDelivery ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                                            }`} />
                                        </div>

                                        <div className="mt-auto">
                                            <div className="mb-1">
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                                    isDelivery ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {isDelivery ? '🌐 Delivery' : '🌐 Retiro'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                            <div className="text-2xl font-black text-gray-900">${Number(order.total).toLocaleString("es-AR")}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* POS Tables */}
                            {sortedTables.map(table => {
                                const styles = getCardStyles(table);
                                return (
                                    <motion.div
                                        key={table.id}
                                        layoutId={`table-${table.id}`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedTable(table)}
                                        className={`rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-2xl border border-white/40 ${styles.bg}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="text-3xl font-black text-gray-900">{table.id}</span>
                                            <div className={`w-3 h-3 rounded-full animate-pulse ${styles.dot}`} />
                                        </div>

                                        <div className="mt-auto">
                                            <div className="mb-1">
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${styles.badgeBg}`}>
                                                    {styles.label}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                            <div className="text-2xl font-black text-gray-900">${table.total.toLocaleString("es-AR")}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    );
                })()
            )}

            {/* Web Order Sheet */}
            {selectedWebOrder && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-3xl"
                        onClick={() => { setSelectedWebOrder(null); fetchWebOrders(); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200, opacity: { duration: 0.2 } }}
                        className="relative z-10 w-full h-full flex flex-col p-4 md:p-10"
                    >
                        <div className="bg-white/90 backdrop-blur-2xl w-full h-full rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col">
                            <OrderSheet
                                tableId={selectedWebOrder.delivery_type === 'delivery' ? 999 : 998}
                                webOrderId={selectedWebOrder.id}
                                webOrderData={selectedWebOrder}
                                onClose={() => { setSelectedWebOrder(null); fetchWebOrders(); }}
                                onOrderComplete={() => { setSelectedWebOrder(null); fetchWebOrders(); fetchTables(); }}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
