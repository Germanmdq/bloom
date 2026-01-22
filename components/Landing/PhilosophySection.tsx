"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function PhilosophySection() {
    return (
        <section className="bg-[#3E2723] py-32 text-[#EFEBE9] overflow-hidden">
            <div className="container mx-auto px-8 max-w-[1400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 items-center">

                    {/* Images Stack */}
                    <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">
                        <motion.div
                            whileHover={{ translateY: -10 }}
                            className="col-span-2 row-span-2 relative rounded-xl overflow-hidden shadow-2xl"
                        >
                            <Image src="/images/about/coffee-pour.png" alt="Preparación" fill className="object-cover brightness-75 sepia-[0.2]" />
                        </motion.div>
                        <motion.div
                            whileHover={{ translateY: -10 }}
                            className="relative rounded-xl overflow-hidden shadow-2xl"
                        >
                            <Image src="/images/hero/coffee-beans-overhead.png" alt="Granos" fill className="object-cover brightness-75 sepia-[0.2]" />
                        </motion.div>
                        <motion.div
                            whileHover={{ translateY: -10 }}
                            className="relative rounded-xl overflow-hidden shadow-2xl"
                        >
                            <Image src="/images/about/latte-art-tulip.png" alt="Arte latte" fill className="object-cover brightness-75 sepia-[0.2]" />
                        </motion.div>
                    </div>

                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <p className="text-2xl italic text-[#A1887F] mb-4">Para nosotros,</p>
                        <h2 className="text-[3.5rem] font-bold leading-[1.2] mb-12 font-display">
                            el café es un arte y cada taza es una experiencia única
                        </h2>
                        <p className="text-[1.2rem] leading-[1.8] mb-8 text-[#A1887F]">
                            En Bloom seleccionamos meticulosamente granos de las mejores
                            regiones cafeteras del mundo. Cada blend es una creación
                            cuidadosa que busca resaltar las notas y sabores únicos de
                            cada origen.
                        </p>
                        <p className="text-[1.2rem] leading-[1.8] text-[#A1887F]">
                            Nuestros baristas dominan tanto técnicas tradicionales como
                            métodos innovadores de extracción, siempre buscando la taza
                            perfecta para nuestros clientes.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
