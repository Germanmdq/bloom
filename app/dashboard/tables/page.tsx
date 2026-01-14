"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Table, TableStatus } from "@/lib/types";
import { OrderSheet } from "@/components/dashboard/OrderSheet";

const initialTables: Table[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    status: Math.random() > 0.7 ? "OCCUPIED" : "FREE",
    total: Math.random() > 0.7 ? Math.floor(Math.random() * 50000) + 1000 : 0
}));

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>(initialTables);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    // Sort: Occupied first, then ID
    const sortedTables = [...tables].sort((a, b) => {
        if (a.status === 'OCCUPIED' && b.status === 'FREE') return -1;
        if (a.status === 'FREE' && b.status === 'OCCUPIED') return 1;
        return a.id - b.id;
    });

    return (
        <div className="relative min-h-full">
            {/* Order Sheet Overlay */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setSelectedTable(null)}
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="relative z-10 w-full max-w-[500px] h-full bg-[#FAFAFA]/95 backdrop-blur-3xl shadow-2xl border-l border-white/20 p-8 overflow-hidden"
                    >
                        <OrderSheet tableId={selectedTable.id} onClose={() => setSelectedTable(null)} />
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
        </div>
    );
}
