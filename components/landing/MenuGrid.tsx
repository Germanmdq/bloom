"use client";

import { menuData } from "@/lib/data";
import { motion } from "framer-motion";
import Image from "next/image";

export function MenuGrid() {
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
                                    <span className="font-semibold text-gray-900">${item.price.toLocaleString()}</span>
                                </div>

                                {item.image && (
                                    <div className="relative h-48 w-full rounded-2xl overflow-hidden mt-4">
                                        <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
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
