"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Table, TableStatus } from "@/lib/types";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";



export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchTables();

        // 🟢 Realtime Subscription
        const channel = supabase
            .channel('salon_tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_tables' }, (payload) => {
                // Optimistic update or just refetch. Refetch is safer for totals.
                fetchTables();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchTables() {
        // ... existing fetchTables code ...
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('salon_tables')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error('Error fetching tables:', error);
                setError(error.message);
            } else if (data) {
                setTables(data as Table[]);
            }
        } catch (err: any) {
            console.error('Unexpected error fetching tables:', err);
            setError(err.message || 'Error inesperado');
        } finally {
            setLoading(false);
        }
    }

    const handleOrderComplete = () => {
        fetchTables(); // Refetch all to stay in sync
    };

    // Sort: Occupied first, then ID
    const sortedTables = [...tables].sort((a, b) => {
        if (a.status === 'OCCUPIED' && b.status === 'FREE') return -1;
        if (a.status === 'FREE' && b.status === 'OCCUPIED') return 1;
        return a.id - b.id;
    });

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
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                            opacity: { duration: 0.2 }
                        }}
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

            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Salón</h2>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> Libre
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div> Ocupada
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
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {sortedTables.map(table => (
                        <motion.div
                            key={table.id}
                            layoutId={`table-${table.id}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTable(table)}
                            className={`aspect-[4/3] rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-2xl border border-white/40
                                ${table.status === 'OCCUPIED'
                                    ? 'bg-orange-100/60 shadow-[0_20px_40px_rgba(249,115,22,0.25)] border-orange-200/50'
                                    : 'bg-white/70 shadow-lg hover:shadow-2xl hover:bg-white/80'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-3xl font-semibold text-gray-900">{table.id}</span>
                                {table.status === 'OCCUPIED' && (
                                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)] animate-pulse" />
                                )}
                            </div>

                            {table.status === 'OCCUPIED' && (
                                <div className="mt-auto">
                                    <div className="mb-2">
                                        {table.order_type === 'DELIVERY' ? (
                                            <span className="inline-block px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest shadow-sm">Delivery</span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 rounded-md bg-black/5 text-black/40 text-[10px] font-black uppercase tracking-widest">Local</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                    <div className="text-2xl font-bold text-gray-900">${table.total.toLocaleString("es-AR")}</div>
                                </div>
                            )}

                            {table.status === 'FREE' && (
                                <div className="mt-auto opacity-30">
                                    <span className="text-lg font-medium">Libre</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
