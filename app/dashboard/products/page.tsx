"use client";

import { menuData } from "@/lib/data";
import { motion } from "framer-motion";
import { Search, Plus, Filter } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function ProductsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="pb-20">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Menú & Productos</h2>
                    <p className="text-gray-500 mt-1">Gestiona tu carta y precios</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/80 backdrop-blur-xl pl-10 pr-4 py-2.5 rounded-xl border border-white/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-64 transition-all"
                        />
                    </div>
                    <button className="bg-white/80 backdrop-blur-xl p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white shadow-sm transition-all">
                        <Filter size={20} />
                    </button>
                    <button className="bg-black text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                        <Plus size={18} />
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {/* Menu Categories & Items */}
            <div className="space-y-12">
                {menuData.map((category) => (
                    <div key={category.id} className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-gray-800">{category.name}</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                            <span className="text-sm font-medium text-gray-400 px-3 py-1 bg-white/50 rounded-full border border-white/40">
                                {category.items.length} productos
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {category.items
                                .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        whileHover={{ y: -5 }}
                                        className="group relative bg-white/60 backdrop-blur-2xl rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/40 flex flex-col"
                                    >
                                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-4">
                                            {item.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                    <span className="text-4xl">☕</span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                EDITAR
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h4>
                                                <span className="font-semibold text-gray-900 bg-white/80 px-2 py-1 rounded-lg text-sm shadow-sm">
                                                    ${item.price.toLocaleString("es-AR")}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                                {item.description}
                                            </p>

                                            <div className="pt-4 border-t border-gray-100/50 flex justify-between items-center mt-auto">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span className="text-xs font-medium text-gray-500">En Stock</span>
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono">ID: {item.id}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
