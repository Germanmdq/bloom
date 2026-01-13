"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

export function Hero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={ref} className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black">
            <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
                <Image
                    src="/images/espresso_explosion_1768310537479.png"
                    alt="Coffee Art"
                    fill
                    className="object-cover opacity-80"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </motion.div>

            <div className="relative z-10 text-center text-white p-4 max-w-4xl mx-auto">
                <motion.h1
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-8xl md:text-9xl font-semibold tracking-tighter mb-4"
                >
                    BLOOM
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="text-xl md:text-2xl font-light tracking-widest text-white/80"
                >
                    Taste the Extraordinary
                </motion.p>
            </div>
        </div>
    );
}
