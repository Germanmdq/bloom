"use client";

import { motion, AnimatePresence } from "framer-motion";
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
    order_type?: string;
    table_id?: number;
};

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Web orders state
    const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
    const [selectedWebOrder, setSelectedWebOrder] = useState<WebOrder | null>(null);
    const [notifications, setNotifications] = useState<WebOrder[]>([]);

    // New Table Modal State
    const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
    const [newTableType, setNewTableType] = useState<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'>('LOCAL');
    const [newTableIdInput, setNewTableIdInput] = useState("");

    const supabase = createClient();

    useEffect(() => {
        fetchTables();
        fetchWebOrders();
        
        // Anti-ghost cleanup for legacy or virtual tables
        supabase.from('salon_tables').delete().gte('id', 300).then(() => {
            console.log('Ghost tables purged.');
        });

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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any;
                // Only notify if it's web and pending (not POS)
                if (newOrder.status === 'pending' && (!newOrder.table_id || newOrder.order_type === 'web')) {
                    setNotifications(prev => [...prev, newOrder]);
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(e => console.log('Audio play failed', e));
                }
                fetchWebOrders();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any;
                const oldOrder = payload.old as any;
                // Transitions from pending_payment to pending (Mercado Pago success)
                if (newOrder.status === 'pending' && oldOrder.status === 'pending_payment' && (!newOrder.table_id || newOrder.order_type === 'web')) {
                    setNotifications(prev => {
                        if (prev.find(n => n.id === newOrder.id)) return prev;
                        return [...prev, newOrder];
                    });
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(e => console.log('Audio play failed', e));
                }
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
            // Usamos una selección más segura para evitar el error 400
            const { data, error } = await supabase
                .from('orders')
                .select('id, status, total, items, created_at, customer_name, customer_phone')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) {
                console.error('[TablesPage] Error Fatal 400:', error.message);
                // Si falla, intentamos una carga mínima absoluta
                const { data: minData } = await supabase.from('orders').select('id, total').limit(10);
                if (minData) console.log('Carga mínima exitosa, el problema es una columna específica.');
                return;
            }
            
            // Filtramos por order_type en el cliente si es necesario para evitar el error 400 en el backend
            if (data) {
                const webOnly = data.filter((o: any) => !o.table_id || o.order_type === 'web');
                setWebOrders(webOnly as WebOrder[]);
            }
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
        .filter(t => t.status === 'OCCUPIED' && t.id < 300)
        .sort((a, b) => a.id - b.id);

    const getCardStyles = (table: Table) => {
        // Delivery range or Web Delivery (999) → RED (Solid Apple float style)
        if ((table.id >= 100 && table.id < 200) || table.id === 999) {
            return {
                bg: 'bg-red-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Delivery',
                textColor: 'text-white',
                subTextColor: 'text-red-100/70',
            };
        }
        // Retiro range → GREEN (Solid Apple float style)
        else if ((table.id >= 200 && table.id < 300)) {
            return {
                bg: 'bg-emerald-500 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
                dot: 'bg-white/40 shadow-sm',
                badgeBg: 'bg-white/20 text-white',
                label: 'Retiro',
                textColor: 'text-white',
                subTextColor: 'text-emerald-100/70',
            };
        }
        // Local → YELLOW (Solid Apple float style)
        return {
            bg: 'bg-amber-400 shadow-[0_22px_70px_rgba(0,0,0,0.18)]',
            dot: 'bg-amber-950/20 shadow-sm',
            badgeBg: 'bg-black/10 text-amber-950',
            label: 'Salón',
            textColor: 'text-amber-950',
            subTextColor: 'text-amber-900/60',
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
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            Bloom <span className="text-gray-300 font-light italic">OS</span>
                        </h1>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-1">Dashboard Actualizado ✓</p>
                    </div>
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
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" /> Salón
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" /> Retiro
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" /> Delivery
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
                <>
                {/* PERSISTENT NOTIFICATION STACK */}
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none">
                    <div className="relative w-[340px] h-[400px]">
                        <AnimatePresence>
                            {notifications.map((notif, idx) => {
                            const isDelivery = notif.delivery_type === 'delivery' || (!notif.delivery_type && notif.order_type === 'web' && !notif.table_id);
                            // We stack them with a little offset
                            const stackOffset = idx * 12;
                            const reverseIdx = notifications.length - 1 - idx;
                            
                            return (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                                    animate={{ 
                                        opacity: 1, 
                                        y: stackOffset, 
                                        scale: 1 - (reverseIdx * 0.05),
                                        zIndex: reverseIdx
                                    }}
                                    exit={{ opacity: 0, scale: 0.5, y: 100 }}
                                    className={`absolute inset-0 p-6 rounded-[2.5rem] shadow-2xl flex flex-col justify-between pointer-events-auto border-4 ${
                                        isDelivery 
                                            ? 'bg-red-500 border-red-400 text-white' 
                                            : 'bg-green-500 border-green-400 text-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                NUEVO PEDIDO WEB
                                            </span>
                                            <h4 className="text-2xl font-black mt-2 leading-tight">
                                                {notif.customer_name || 'Sin Nombre'}
                                            </h4>
                                        </div>
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                                            {isDelivery ? '🛵' : '🛍️'}
                                        </div>
                                    </div>

                                    <div className="space-y-1 my-4 flex-1">
                                        <p className="text-sm font-bold opacity-80">Total: ${Number(notif.total).toLocaleString()}</p>
                                        <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest italic truncate">{notif.id}</p>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setNotifications(prev => prev.filter(p => p.id !== notif.id));
                                            setSelectedWebOrder(notif);
                                        }}
                                        className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                                    >
                                        Aceptar Pedido
                                    </button>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>
                    {notifications.length > 1 && (
                        <div className="mt-4 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-2xl pointer-events-none">
                            Tenés {notifications.length} pedidos pendientes
                        </div>
                    )}
                </div>
                {(() => {
                    const totalItems = webOrders.length + sortedTables.length;
                    // Adapt columns starting from a minimum of 4
                    const gridCols =
                        totalItems <= 6 ? 'grid-cols-3' :
                totalItems <= 8 ? 'grid-cols-4' :
                        totalItems <= 12 ? 'grid-cols-5' :
                        'grid-cols-6';

                    return (
                        <div className={`grid ${gridCols} gap-6`}>
                            {/* Individual Web Order Cards (Only those not in notification stack) */}
                            {webOrders.filter(order => !notifications.find(n => n.id === order.id)).map(order => {
                                const isDelivery = order.delivery_type === 'delivery';
                                const productItems = (order.items || []).filter((i: any) => !i.is_meta);
                                const timeStr = new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <motion.div
                                        key={order.id}
                                        layoutId={`weborder-${order.id}`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedWebOrder(order)}
                                        className={`rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden shadow-[0_22px_70px_rgba(0,0,0,0.18)] min-h-[400px] ${
                                            isDelivery ? 'bg-red-500' : 'bg-emerald-500'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="text-white/80 text-xs font-bold uppercase tracking-widest">{isDelivery ? 'Delivery' : 'Retiro'}</span>
                                            <div className="bg-white/20 px-3 py-1 rounded-full text-white text-xs font-bold">{timeStr}</div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xl font-black text-white leading-tight truncate">{order.customer_name || 'Cliente Web'}</p>
                                            {order.customer_phone && (
                                                <p className="text-white/70 text-xs font-bold mt-0.5">{order.customer_phone}</p>
                                            )}
                                        </div>
                                        <div className="flex-1 mt-3 space-y-0.5">
                                            {productItems.slice(0, 3).map((item: any, idx: number) => (
                                                <p key={idx} className="text-white/80 text-xs">{item.quantity}× {item.name}</p>
                                            ))}
                                            {productItems.length > 3 && (
                                                <p className="text-white/60 text-xs italic">+{productItems.length - 3} más</p>
                                            )}
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-white/20">
                                            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Total</span>
                                            <div className="text-2xl font-black text-white">${Number(order.total || 0).toLocaleString('es-AR')}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* POS Tables */}
                            {sortedTables.map(table => {
                                const styles = getCardStyles(table);
                                const timeStr = table.updated_at ? new Date(table.updated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                return (
                                    <motion.div
                                        key={table.id}
                                        layoutId={`table-${table.id}`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedTable(table)}
                                        className={`rounded-[2.5rem] p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden min-h-[400px] ${styles.bg}`}
                                    >
                                        {/* Superimposed Table Number */}
                                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] font-black text-[15rem] leading-none ${styles.textColor}`}>
                                            {table.id}
                                        </div>

                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className={`text-4xl font-black tracking-tighter ${styles.textColor}`}>{table.id}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className={`w-3 h-3 rounded-full animate-pulse mb-2 ${styles.dot}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${styles.subTextColor} flex items-center gap-1`}>
                                                    🕒 {timeStr}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-auto">
                                            <div className="h-px w-full bg-white/20 mb-6" />
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${styles.subTextColor}`}>Total de la Mesa</p>
                                            <div className={`text-5xl font-black tracking-tighter ${styles.textColor}`}>
                                                ${table.total.toLocaleString("es-AR")}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    );
                })()}
                </>
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
                        tableId={selectedWebOrder.delivery_type === 'delivery' ? 5001 : 5000}
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
