"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_id: string;
}

export interface Category {
    id: string;
    name: string;
    items?: Product[];
}

interface MenuGridProps {
    categories: Category[];
    products: Product[];
}

function formatName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function MenuGrid({ categories, products }: MenuGridProps) {
    const menuData = categories.map(category => {
        const categoryProducts = products.filter(p => p.category_id === category.id);
        return {
            id: category.id,
            name: category.name,
            items: categoryProducts
        };
    }).filter(cat => cat.items.length > 0);

    return (
        <section className="bg-[#3E2723] py-32 text-[#EFEBE9] relative" id="menu">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-5 blur-[100px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-8 max-w-7xl relative z-10">
                <div className="text-center mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-5xl font-black mb-4 font-display text-[#EFEBE9]"
                    >
                        Nuestra Selección Premium
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-[#D4AF37] italic font-display"
                    >
                        Descubre sabores que despiertan los sentidos
                    </motion.p>
                </div>

                {menuData.map((category) => (
                    <div key={category.id} className="mb-24 last:mb-0">
                        <motion.h3
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl font-bold mb-12 text-[#D4AF37] border-b border-[#D4AF37]/20 pb-4 font-display inline-block"
                        >
                            {formatName(category.name)}
                        </motion.h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                            {category.items?.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group flex gap-6 items-start p-6 rounded-3xl hover:bg-[#EFEBE9]/5 transition-all duration-300 border border-transparent hover:border-[#D4AF37]/10 hover:-translate-y-1"
                                >
                                    <div className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden border border-[#D4AF37]/20 shadow-lg group-hover:scale-110 transition-transform duration-500 bg-[#2C1B18]">
                                        {item.image_url ? (
                                            <Image
                                                src={item.image_url}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#D4AF37]/30">
                                                <span className="text-xs uppercase font-bold">Bloom</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-3 border-b border-dashed border-[#EFEBE9]/10 pb-2">
                                            <h4 className="text-xl font-bold text-[#EFEBE9] font-display group-hover:text-[#D4AF37] transition-colors">{formatName(item.name)}</h4>
                                            <span className="text-xl font-bold text-[#D4AF37] ml-4 font-display">${item.price}</span>
                                        </div>
                                        <p className="text-[#EFEBE9]/60 text-sm leading-relaxed font-light line-clamp-2 group-hover:text-[#EFEBE9]/90 transition-colors">
                                            {item.description || "Una deliciosa experiencia para tu paladar, preparada con los mejores ingredientes."}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
