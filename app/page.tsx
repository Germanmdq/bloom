"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Bike, CalendarDays, ChefHat, MapPin, Star, Clock } from "lucide-react";
import { useRef } from "react";

// --- ANIMATION HELPERS ---
const FadeIn = ({ children, delay = 0, className = "" }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        className={className}
    >
        {children}
    </motion.div>
);

export default function Home() {
    return (
        <main className="min-h-screen font-sans bg-white selection:bg-orange-500 selection:text-white">

            {/* --- HERO SECTION --- */}
            <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
                {/* Background Image with Parallax Effect */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.unsplash.com/photo-1544025162-d7669d2d09bd?q=80&w=2674&auto=format&fit=crop"
                        alt="Bloom Atmosphere"
                        fill
                        className="object-cover brightness-[0.35]"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                    >
                        <span className="inline-block py-1 px-3 border border-white/20 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium tracking-wider mb-6">
                            EST. 2010 • BUENOS AIRES
                        </span>
                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-none">
                            BLOOM<span className="text-orange-500">.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
                            Cocina de autor honesta. Ingredientes reales. <br className="hidden md:block" />
                            La experiencia gastronómica que estabas buscando.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/menu" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(234,88,12,0.6)] hover:shadow-[0_0_60px_-10px_rgba(234,88,12,0.8)] hover:-translate-y-1">
                                    <Bike size={20} /> PEDIR DELIVERY
                                </button>
                            </Link>
                            <Link href="/reservations" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                                    <CalendarDays size={20} /> RESERVAR MESA
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- HIGHLIGHTS / BENTO GRID --- */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <FadeIn className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
                            Mucho más que comida.
                        </h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            En Bloom cuidamos cada detalle, desde la selección de proveedores locales hasta el emplatado final.
                        </p>
                    </FadeIn>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <FadeIn delay={0.1} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-start gap-4 hover:scale-[1.02] transition-transform duration-500">
                            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-2">
                                <ChefHat size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Cocina de Autor</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Recetas clásicas reinventadas con técnicas modernas. Nuestra milanesa no es solo una milanesa.
                            </p>
                        </FadeIn>

                        {/* Card 2 */}
                        <FadeIn delay={0.2} className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-900/20 flex flex-col items-start gap-4 hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-2 backdrop-blur-sm">
                                <Star size={32} />
                            </div>
                            <h3 className="text-2xl font-bold">Calidad Premium</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Trabajamos exclusivamente con carnes de pastura y vegetales orgánicos de estación.
                            </p>
                        </FadeIn>

                        {/* Card 3 */}
                        <FadeIn delay={0.3} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-start gap-4 hover:scale-[1.02] transition-transform duration-500">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Siempre Listos</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Abierto todos los días. Almuerzos ejecutivos, cenas íntimas y delivery rápido.
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* --- FEATURED DISHES SPLIT SECTION --- */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <FadeIn className="lg:w-1/2 relative">
                            <div className="relative aspect-square w-full max-w-lg mx-auto transform rotate-3 hover:rotate-0 transition-all duration-700">
                                <Image
                                    src="https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=2670&auto=format&fit=crop"
                                    alt="Lomo Plate"
                                    fill
                                    className="object-cover rounded-[2.5rem] shadow-2xl"
                                />
                                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 max-w-xs animate-bounce-slow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="text-orange-500 fill-orange-500" size={16} />
                                        <span className="font-bold text-sm">Plato Estrella</span>
                                    </div>
                                    <p className="font-bold text-gray-900 text-lg">Lomo a la Pimienta</p>
                                    <p className="text-gray-500 text-sm">Con papas rústicas y reducción de Malbec.</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn className="lg:w-1/2 space-y-8">
                            <span className="text-orange-600 font-bold tracking-widest uppercase text-sm">Nuestra Carta</span>
                            <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-[1.1]">
                                Sabores que <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">cuentan historias.</span>
                            </h2>
                            <p className="text-xl text-gray-500 leading-relaxed">
                                Desde nuestras famosas milanesas napolitanas hasta pastas caseras amasadas cada mañana. Nuestro menú es un homenaje a la cocina argentina con un toque contemporáneo.
                            </p>

                            <div className="pt-4">
                                <Link href="/menu">
                                    <button className="group flex items-center gap-3 text-lg font-bold text-gray-900 hover:text-orange-600 transition-colors">
                                        Explorar el Menú Completo
                                        <span className="bg-gray-100 group-hover:bg-orange-100 p-2 rounded-full transition-colors">
                                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </button>
                                </Link>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* --- CTA BANNER --- */}
            <section className="py-24 px-6">
                <div className="container mx-auto">
                    <FadeIn className="relative bg-black rounded-[3rem] overflow-hidden px-6 py-24 md:px-20 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10">
                        {/* Background Texture */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>

                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                                ¿Con hambre?
                            </h2>
                            <p className="text-gray-400 text-xl font-medium mb-0">
                                Pide ahora desde nuestra web y recibe descuentos exclusivos. Sin esperas.
                            </p>
                        </div>

                        <div className="relative z-10 shrink-0">
                            <Link href="/menu">
                                <button className="px-10 py-5 bg-white hover:bg-gray-100 text-black text-lg font-black rounded-full transition-all shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 flex items-center gap-3">
                                    PIDE AHORA <ArrowRight strokeWidth={3} size={20} />
                                </button>
                            </Link>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* --- LOCATION & FOOTER --- */}
            <footer className="bg-white border-t border-gray-100 pt-20 pb-10">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tighter">BLOOM.</h3>
                            <p className="text-gray-500 max-w-sm mb-6">
                                Cocina honesta creada para compartir. <br />
                                Te esperamos para vivir momentos únicos.
                            </p>
                            <div className="flex gap-4">
                                {/* Social Placeholders */}
                                <div className="w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"></div>
                                <div className="w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Ubicación</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li className="flex gap-2"><MapPin size={18} /> Av. Libertador 1400</li>
                                <li>Buenos Aires, Argentina</li>
                                <li className="mt-4 text-orange-600 font-bold cursor-pointer hover:underline">Ver en Mapa</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Contacto</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li>+54 9 11 1234-5678</li>
                                <li>reservas@bloom.com</li>
                                <li>
                                    <Link href="/menu" className="text-orange-600 font-bold hover:underline">Delivery Online</Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-8 text-center text-gray-400 text-sm">
                        &copy; 2026 Bloom Restaurant. Todos los derechos reservados.
                    </div>
                </div>
            </footer>
        </main>
    );
}

// Add global styles for smooth scroll if needed, but Tailwind handles most.
