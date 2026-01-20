"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Image from "next/image";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_id: string;
}

interface Category {
    id: string;
    name: string;
    items: Product[];
}

export function MenuGrid() {
    const [menuData, setMenuData] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const { data: categories, error: catError } = await supabase.from('categories').select('*').order('name');
            const { data: products, error: prodError } = await supabase.from('products').select('*');

            if (catError) console.error("Error fetching categories:", catError);
            if (prodError) console.error("Error fetching products:", prodError);

            if (categories && products) {
                // Group products by category
                const groupedData = categories.map(category => {
                    const categoryProducts = products.filter(p => p.category_id === category.id);
                    return {
                        id: category.id,
                        name: category.name,
                        items: categoryProducts
                    };
                }).filter(cat => cat.items.length > 0); // Only show categories with items

                console.log("Grouped Data:", groupedData);
                setMenuData(groupedData);
            }
            setLoading(false);
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="py-32 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
            {menuData.map((category) => (
                <div key={category.id} className="mb-24">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-semibold tracking-tight text-gray-900 mb-8 ml-2"
                    >
                        {category.name}
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category.items.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                whileHover={{ scale: 1.02 }}
                                className="group relative bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-medium text-gray-900">{item.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                    </div>
                                    <span className="font-semibold text-gray-900">${item.price.toLocaleString("es-AR")}</span>
                                </div>

                                {item.image_url && (
                                    <div className="relative h-48 w-full rounded-2xl overflow-hidden mt-4">
                                        <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
