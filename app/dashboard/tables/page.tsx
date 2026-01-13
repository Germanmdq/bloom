"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const initialTables = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    status: Math.random() > 0.7 ? "OCCUPIED" : "FREE",
    total: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) + 1000 : 0
}));

export default function TablesPage() {
    const [tables, setTables] = useState(initialTables);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Floor Plan</h2>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> Free
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div> Occupied
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {tables.map(table => (
                    <motion.div
                        key={table.id}
                        layoutId={`table-${table.id}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`aspect-square rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-md border border-white/40
                            ${table.status === 'OCCUPIED' ? 'bg-orange-100/50 shadow-inner' : 'bg-white/60 shadow-sm'}
                        `}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-2xl font-semibold text-gray-900">{table.id}</span>
                            {table.status === 'OCCUPIED' && (
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse" />
                            )}
                        </div>

                        {table.status === 'OCCUPIED' && (
                            <div className="mt-auto">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current</span>
                                <div className="text-lg font-bold text-gray-900">${table.total.toLocaleString()}</div>
                            </div>
                        )}

                        {table.status === 'FREE' && (
                            <div className="mt-auto opacity-30">
                                <span className="text-sm font-medium">Empty</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
