"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const supabase = createClient();

// Fetch Function
async function fetchMenu() {
    // Fetch categories
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    // Fetch products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');

    return { categories, products };
}

export default function PublicMenuPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['public_menu'],
        queryFn: fetchMenu,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center text-[#6B4E3D]">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="font-serif tracking-widest text-sm">PREPARANDO LA CARTA...</p>
            </div>
        );
    }

    const { categories = [], products = [] } = data || {};

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#3E2723]">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-[#6B4E3D] text-[#F5E6D3] py-4 px-6 shadow-md flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">
                    <ArrowLeft size={16} /> Volver
                </Link>
                <div className="font-serif text-xl font-bold tracking-widest">BLOOM</div>
                <div className="w-16"></div> {/* Spacer for alignment */}
            </header>

            {/* Menu Content */}
            <main className="max-w-3xl mx-auto p-8 pb-32">

                <div className="text-center mb-16 mt-8">
                    <h1 className="text-5xl font-serif font-bold text-[#E8A387] mb-4">Nuestra Carta</h1>
                    <p className="text-gray-500 italic">Sabores caseros, ingredientes frescos.</p>
                </div>

                {categories?.map((category: any) => {
                    // Filter products for this category
                    const catProducts = products?.filter((p: any) => p.category_id === category.id);

                    if (!catProducts || catProducts.length === 0) return null;

                    return (
                        <div key={category.id} className="mb-16">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-[#6B4E3D] border-b-2 border-[#E8A387]/30 pb-4 mb-8">
                                {category.name}
                            </h2>

                            <div className="grid grid-cols-1 gap-6">
                                {catProducts.map((product: any) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        key={product.id}
                                        className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8A387]/20 flex justify-between items-start gap-4"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-[#3E2723] mb-1">{product.name}</h3>
                                            {product.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed mb-2">{product.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-[#D4AF37] block">
                                                ${product.price?.toLocaleString()}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                <div className="text-center pt-12 border-t border-[#E8A387]/20 mt-12 text-gray-400 text-sm">
                    <p>Precios sujetos a cambios sin previo aviso.</p>
                    <p>Consultar por opciones sin TACC.</p>
                </div>

            </main>

            {/* Floating Delivery Button */}
            <a
                href="https://wa.me/5492231234567?text=Hola!%20Quiero%20hacer%20un%20pedido"
                target="_blank"
                rel="noreferrer"
                className="fixed bottom-8 right-8 bg-[#25D366] text-white px-6 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 z-50 uppercase tracking-widest"
            >
                <span>🛵 Pedir Delivery</span>
            </a>
        </div>
    );
}
