"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Package, TrendingUp, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function InventarioPage() {
    const supabase = createClient();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        const { data, error } = await supabase
            .from("products")
            .select("id, name, stock, vendidos")
            .order("name");
        
        if (error) {
            toast.error(`Error: ${error.message}`);
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    }

    /** Actualizar stock con el número ingresado */
    async function handleUpdateStock(id: string, newStock: number) {
        setUpdatingId(id);
        const { error } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", id);

        if (error) {
            toast.error("No se pudo actualizar el stock");
        } else {
            toast.success("Stock actualizado correctamente");
        }
        setUpdatingId(null);
    }

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="p-8 flex justify-center items-center h-screen bg-[#f7f5ef]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#2d4a3e]" />
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 pb-32 min-h-screen bg-[#f7f5ef]">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-neutral-100">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-neutral-900 leading-none">Gestión de Stock</h1>
                    <p className="text-neutral-400 font-bold uppercase tracking-[0.2em] text-[10px]">Control centralizado de mercadería y ventas</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-neutral-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#2d4a3e]/20 outline-none transition-all shadow-inner"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p) => {
                        const isOutOfStock = p.stock <= 0;

                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="bg-white rounded-[2rem] p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-[280px] hover:shadow-md transition-all group"
                            >
                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2d4a3e] opacity-40">Producto</span>
                                        {isOutOfStock && <span className="bg-red-50 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Sin Stock</span>}
                                    </div>
                                    <h3 className="text-lg font-black text-neutral-900 line-clamp-2 leading-tight min-h-[3rem]">{p.name}</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-50 group-hover:bg-neutral-100 transition-colors">
                                        <p className="flex items-center gap-1 text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">
                                            <TrendingUp size={10} /> Ventas
                                        </p>
                                        <p className="text-xl font-black text-[#2d4a3e]">{p.vendidos || 0}</p>
                                    </div>
                                    <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-50 group-hover:bg-neutral-100 transition-colors">
                                        <p className="flex items-center gap-1 text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">
                                            <Package size={10} /> Stock
                                        </p>
                                        <p className={`text-xl font-black ${isOutOfStock ? 'text-red-500' : 'text-neutral-900'}`}>
                                            {p.stock || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[9px] font-black uppercase text-[#2d4a3e] tracking-widest">Cargar Mercadería (+)</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number"
                                            placeholder="Ej: 10"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.target as HTMLInputElement;
                                                    const val = parseFloat(input.value);
                                                    if (!isNaN(val) && val !== 0) {
                                                        const newStock = (p.stock || 0) + val;
                                                        await handleUpdateStock(p.id, newStock);
                                                        input.value = ""; // Borrar el número de abajo tras cargar
                                                        // Actualizamos estado local inmediatamente para feedback visual
                                                        setProducts(prev => prev.map(item => item.id === p.id ? { ...item, stock: newStock } : item));
                                                    }
                                                }
                                            }}
                                            className="w-full bg-neutral-50 border-2 border-transparent focus:border-[#2d4a3e]/20 rounded-xl px-4 py-3 font-black text-lg outline-none transition-all text-center placeholder:text-neutral-200"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
