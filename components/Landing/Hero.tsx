"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

import Link from "next/link";

export function Hero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={ref} className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black font-poppins">
            {/* Top Navigation */}
            <nav className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6">
                <div className="font-serif text-white text-xl font-bold tracking-widest relative z-50">BLOOM</div>

                {/* Desktop Nav */}
                <div className="hidden md:flex gap-8">
                    <Link href="/menu" className="text-white font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors drop-shadow-md">
                        Menú
                    </Link>
                    <Link href="/menu" className="text-white font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors drop-shadow-md">
                        Delivery
                    </Link>
                    <Link href="#about" onClick={(e) => { e.preventDefault(); document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors drop-shadow-md">
                        Quiénes Somos
                    </Link>
                    <Link href="#contact" onClick={(e) => { e.preventDefault(); document.querySelector('.contact-section')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors drop-shadow-md">
                        Contacto
                    </Link>
                </div>

                {/* Mobile Burger */}
                <div className="md:hidden z-50">
                    <button
                        onClick={() => document.getElementById('mobile-menu')?.classList.toggle('translate-x-full')}
                        className="text-white p-2"
                    >
                        <div className="w-8 h-0.5 bg-white mb-2 shadow-sm"></div>
                        <div className="w-8 h-0.5 bg-white mb-2 shadow-sm"></div>
                        <div className="w-8 h-0.5 bg-white shadow-sm"></div>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                <div id="mobile-menu" className="fixed inset-0 bg-black/95 z-[60] transition-transform duration-300 translate-x-full flex flex-col items-center justify-center gap-8">
                    <button
                        onClick={() => document.getElementById('mobile-menu')?.classList.add('translate-x-full')}
                        className="absolute top-6 right-8 text-white p-2"
                    >
                        <div className="text-4xl">✕</div>
                    </button>

                    <Link href="/menu" className="text-white text-2xl font-bold uppercase tracking-widest hover:text-[#D4AF37]">
                        Menú
                    </Link>
                    <Link href="/menu" className="text-white text-2xl font-bold uppercase tracking-widest hover:text-[#D4AF37]">
                        Delivery
                    </Link>
                    <button
                        onClick={() => {
                            document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' });
                            document.getElementById('mobile-menu')?.classList.add('translate-x-full');
                        }}
                        className="text-white text-2xl font-bold uppercase tracking-widest hover:text-[#D4AF37]"
                    >
                        Quiénes Somos
                    </button>
                    <button
                        onClick={() => {
                            document.querySelector('.contact-section')?.scrollIntoView({ behavior: 'smooth' });
                            document.getElementById('mobile-menu')?.classList.add('translate-x-full');
                        }}
                        className="text-white text-2xl font-bold uppercase tracking-widest hover:text-[#D4AF37]"
                    >
                        Contacto
                    </button>
                </div>
            </nav>
            <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
                <Image
                    src="/images/hero-new.jpg"
                    alt="Bloom Coffee"
                    fill
                    className="object-cover opacity-80"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </motion.div>

            <div className="relative z-10 text-center text-white p-4 max-w-4xl mx-auto flex flex-col items-center">
                <motion.h1
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-8xl md:text-9xl font-semibold tracking-tighter mb-4 drop-shadow-2xl relative"
                >
                    <span className="absolute inset-0 blur-2xl bg-black/50 rounded-full scale-125 -z-10" />
                    BLOOM
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="text-xl md:text-2xl font-light tracking-widest text-white/90 drop-shadow-lg font-serif"
                >
                    Saborea lo Extraordinario
                </motion.p>
            </div>
        </div>
    );
}
