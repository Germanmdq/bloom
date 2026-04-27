"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Minus, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LÓGICA DE INVENTARIO BLOOM
 * Reglas:
 * 1. Solo gestión de stock de ítems existentes.
 * 2. Venta Directa (+1 Vendido, -X Stock).
 * 3. Excepción: Café/Cortado Doble -> -2 Stock Cafe, +1 Vendido.
 * 4. Control Manual: Botón +1 para subir stock mercadería.
 * 5. Seguridad: No permite vender si stock es 0.
 */

export default function InventarioPage() {
    const supabase = createClient();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        // Traemos productos de tipo 'menu'
        const { data, error } = await supabase
            .from("products")
            .select("id, name, stock, vendidos")
            .eq("active", true)
            .order("name");
        
        if (error) {
            console.error(error);
            toast.error("Error al cargar inventario");
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    }

    /** 
     * Lógica de Venta 
     * @param product Objeto del producto
     */
    async function registrarVenta(product: any) {
        // Quitamos la restricción de stock <= 0 por pedido del usuario

        // Definir cuánto resta de stock
        let unidadesARestar = 1;
        const nombreLower = product.name.toLowerCase();
        if (nombreLower.includes("doble") && (nombreLower.includes("café") || nombreLower.includes("cafe") || nombreLower.includes("cortado"))) {
            unidadesARestar = 2;
        }

        const newStock = (product.stock || 0) - unidadesARestar;
        const newVendidos = (product.vendidos || 0) + 1;

        const { error } = await supabase
            .from("products")
            .update({ stock: newStock, vendidos: newVendidos })
            .eq("id", product.id);

        if (error) {
            toast.error("Error al registrar venta");
        } else {
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock, vendidos: newVendidos } : p));
            toast.success(`Venta registrada: ${product.name}`);
        }
    }

    /** Lógica de carga de mercadería (+1 Manual) */
    async function sumarStockManual(product: any) {
        const newStock = (product.stock || 0) + 1;
        
        const { error } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", product.id);

        if (error) {
            toast.error("Error al actualizar stock");
        } else {
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
            toast.info(`Stock actualizado: ${product.name} (+1)`);
        }
    }

    if (loading) return (
        <div className="p-8 flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#2d4a3e]" />
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-neutral-900">Control de Inventario</h1>
                <p className="text-neutral-500 font-medium uppercase tracking-widest text-xs">Conteo continuo de stock y ventas directas</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {products.map((p) => {
                        const isLowStock = p.stock <= 5;
                        const isOutOfStock = p.stock <= 0;

                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`relative overflow-hidden bg-white border-2 rounded-[2rem] p-6 transition-all shadow-sm ${isOutOfStock ? 'border-red-100' : 'border-neutral-100'} hover:border-[#2d4a3e]/30 hover:shadow-xl`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d4a3e]/60 mb-1">Carga Directa</span>
                                        <h3 className="text-xl font-bold text-neutral-900 leading-tight">{p.name}</h3>
                                    </div>
                                    <button 
                                        onClick={() => sumarStockManual(p)}
                                        className="bg-[#2d4a3e] text-white p-2.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-lg"
                                        title="Recibir mercadería (+1 Stock)"
                                    >
                                        <Plus size={20} strokeWidth={3} />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4 mt-6">
                                    <div className="flex justify-around items-center bg-neutral-50 rounded-2xl py-4 border border-neutral-100">
                                        <div className="flex flex-col items-center">
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                                <Package size={12} /> Stock
                                            </span>
                                            <span className={`text-4xl font-black tracking-tighter ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-500' : 'text-neutral-900'}`}>
                                                {p.stock || 0}
                                            </span>
                                        </div>
                                        <div className="w-[1px] h-10 bg-neutral-200" />
                                        <div className="flex flex-col items-center">
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                                <TrendingUp size={12} /> Vendidos
                                            </span>
                                            <span className="text-4xl font-black tracking-tighter text-[#2d4a3e]">
                                                {p.vendidos || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => registrarVenta(p)}
                                        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-black text-white hover:bg-neutral-900 transition-all shadow-md active:scale-95"
                                    >
                                        Vender Ítem
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
