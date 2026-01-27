"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function ExperienceGallery() {
    return (
        <section className="experience-section py-32 bg-gradient-to-br from-[#A1887F] to-[#EFEBE9]">
            <div className="container mx-auto px-8 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black mb-4 font-display text-[#3E2723]">La Experiencia Bloom</h2>
                    <p className="text-2xl italic text-[#3E2723]/70 font-display">Cada visita es un viaje sensorial</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[300px] gap-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative group md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden cursor-pointer shadow-2xl"
                    >
                        <Image src="/images/gallery/interior-cozy.png" alt="Interior acogedor" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                            <div>
                                <h3 className="text-3xl font-bold text-[#D4AF37] mb-2 font-display">Ambiente Acogedor</h3>
                                <p className="text-[#EFEBE9] text-lg">Espacios diseñados para tu comodidad</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="relative group rounded-3xl overflow-hidden cursor-pointer shadow-xl"
                    >
                        <Image src="/images/gallery/latte-art-detail.png" alt="Arte Latte" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                            <h3 className="text-xl font-bold text-[#D4AF37] font-display">Arte en Cada Taza</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative group rounded-3xl overflow-hidden cursor-pointer shadow-xl"
                    >
                        <Image src="/images/gallery/pastries.png" alt="Pastelería" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                            <h3 className="text-xl font-bold text-[#D4AF37] font-display">Pastelería Fresca</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="relative group md:row-span-2 rounded-3xl overflow-hidden cursor-pointer shadow-xl"
                    >
                        <Image src="/images/gallery/coffee-beans-close.png" alt="Granos Premium" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                            <div>
                                <h3 className="text-2xl font-bold text-[#D4AF37] mb-2 font-display">Granos Premium</h3>
                                <p className="text-[#EFEBE9]">Selección mundial</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="relative group rounded-3xl overflow-hidden cursor-pointer shadow-xl"
                    >
                        <Image src="/images/gallery/barista-work.png" alt="Barista" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                            <h3 className="text-xl font-bold text-[#D4AF37] font-display">Maestros Baristas</h3>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
