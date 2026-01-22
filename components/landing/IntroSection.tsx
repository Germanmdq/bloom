"use client";

import { motion } from "framer-motion";

export function IntroSection() {
    return (
        <section className="bg-[#EFEBE9] py-40 text-center">
            <div className="container mx-auto px-8 max-w-[900px]">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-[6rem] font-black tracking-[0.3em] text-[#3E2723] font-display mb-6">BLOOM</h1>
                    <h2 className="text-[2.5rem] text-[#6D4C41] font-normal mb-16">
                        Mar del Plata <span className="italic text-[#D4AF37]">Argentina</span>
                    </h2>

                    <p className="text-[1.3rem] leading-[1.9] text-[#6D4C41] mb-8 max-w-3xl mx-auto">
                        Bloom es un espacio dedicado al arte del café, donde cada taza
                        es una experiencia sensorial única. Nuestros baristas expertos
                        seleccionan granos premium de diferentes regiones del mundo.
                    </p>

                    <p className="text-[1.3rem] leading-[1.9] text-[#6D4C41] max-w-3xl mx-auto">
                        Ubicados en el corazón de Mar del Plata, hemos creado un ambiente
                        acogedor donde la pasión por el café se encuentra con la hospitalidad
                        argentina.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
