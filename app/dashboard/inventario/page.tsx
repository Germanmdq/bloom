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
            console.error("DEBUG INVENTARIO ERROR:", error);
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p) => {
                        const isOutOfStock = p.stock <= 0;

                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 flex flex-col gap-6 relative overflow-hidden"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2d4a3e] opacity-50">Producto</span>
                                    <h3 className="text-xl font-black text-neutral-900 leading-tight">{p.name}</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-neutral-50 rounded-3xl p-4 border border-neutral-100">
                                        <p className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                            <TrendingUp size={12} /> Vendidos
                                        </p>
                                        <p className="text-2xl font-black text-[#2d4a3e]">{p.vendidos || 0}</p>
                                    </div>
                                    <div className="bg-neutral-50 rounded-3xl p-4 border border-neutral-100">
                                        <p className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                            <Package size={12} /> Stock Actual
                                        </p>
                                        <p className={`text-2xl font-black ${isOutOfStock ? 'text-red-500' : 'text-neutral-900'}`}>
                                            {p.stock || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Actualizar stock físico</p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number"
                                            defaultValue={p.stock}
                                            onBlur={async (e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val) && val !== p.stock) {
                                                    await handleUpdateStock(p.id, val);
                                                }
                                            }}
                                            className="flex-1 bg-neutral-100 border-2 border-transparent focus:border-[#2d4a3e]/30 rounded-2xl px-5 py-3.5 font-black text-xl outline-none transition-all"
                                        />
                                        <button 
                                            className="bg-[#2d4a3e] text-white px-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
                                            disabled={updatingId === p.id}
                                        >
                                            {updatingId === p.id ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Save size={20} strokeWidth={3} />
                                            )}
                                        </button>
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
