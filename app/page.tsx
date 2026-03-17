"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bike, MapPin, Star, X, LogIn } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

// --- LOGIN MODAL ---
function LoginModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
            setError("Credenciales inválidas. Por favor intenta de nuevo.");
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-black px-8 pt-10 pb-8 text-center">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600 rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <X size={16} />
                    </button>
                    <h2 className="text-3xl font-black text-white tracking-tighter mb-1">BLOOM<span className="text-orange-500">.</span></h2>
                    <p className="text-gray-400 text-sm font-medium">Acceso para Empleados</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-black/10 focus:border-black/20 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-900"
                            placeholder="nombre@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-black/10 focus:border-black/20 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-900"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-semibold text-center bg-red-50 py-2 rounded-xl">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                    >
                        <LogIn size={18} />
                        {loading ? "Iniciando sesión..." : "Ingresar al Sistema"}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

export default function Home() {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <main className="min-h-screen font-sans bg-[#FAF7F2] selection:bg-orange-500 selection:text-white">

            <AnimatePresence>
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            </AnimatePresence>

            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent">
                <span className="text-white font-black text-xl tracking-tighter drop-shadow-lg">BLOOM<span className="text-orange-500">.</span></span>
                <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-white/80">
                    <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
                    <Link href="/menu" className="hover:text-white transition-colors">Menú</Link>
                    <Link href="/menu?cat=Platos Diarios" className="hover:text-white transition-colors">Platos del Día</Link>
                    <Link href="/menu?cat=Promociones" className="hover:text-white transition-colors">Promociones</Link>
                </div>
                <button
                    onClick={() => setShowLogin(true)}
                    className="opacity-0 hover:opacity-30 transition-opacity w-8 h-8 flex items-center justify-center"
                    title=""
                >
                    <LogIn size={14} className="text-white" />
                </button>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden bg-gray-900">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/hero/bloom-cups-hero.png"
                        alt="Bloom Coffee & More"
                        fill
                        className="object-cover brightness-[0.4]"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </div>

                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                    >
                        <span className="inline-block py-1 px-3 border border-white/20 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium tracking-wider mb-6">
                            MAR DEL PLATA • ARGENTINA
                        </span>
                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-none">
                            BLOOM<span className="text-orange-500">.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
                            Café de especialidad, pastelería artesanal y mucho más. <br className="hidden md:block" />
                            El lugar donde cada taza florece.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/menu" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(234,88,12,0.6)] hover:shadow-[0_0_60px_-10px_rgba(234,88,12,0.8)] hover:-translate-y-1">
                                    <Bike size={20} /> VER MENÚ
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- MENU BENTO --- */}
            <section className="py-20 bg-[#FAF7F2]">
                <div className="container mx-auto px-4 md:px-6">
                    <FadeIn className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <span className="text-orange-600 font-bold tracking-widest uppercase text-sm">Nuestra Carta</span>
                            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none mt-1">
                                Mucho más<br />que un café.
                            </h2>
                        </div>
                        <Link href="/menu">
                            <button className="group flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-full hover:bg-orange-600 transition-all shrink-0">
                                Ver menú completo <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </FadeIn>

                    {/* BENTO GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-[auto] gap-3">

                        {/* Card grande — Platos diarios */}
                        <FadeIn delay={0.05} className="col-span-2 row-span-2 relative rounded-3xl overflow-hidden group cursor-pointer h-72 md:h-auto">
                            <Link href="/menu?cat=Platos Diarios">
                                <Image src="/images/categories/platos-diarios.png" alt="Platos Diarios" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-6">
                                    <span className="text-white/70 text-sm font-medium uppercase tracking-widest">Almuerzo & Cena</span>
                                    <h3 className="text-white text-3xl font-black tracking-tight mt-1">Platos del Día</h3>
                                    <p className="text-white/60 text-sm mt-1">Milanesas · Pastas · Platos caseros</p>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Pastelería */}
                        <FadeIn delay={0.1} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Pastelería">
                                <Image src="/images/categories/pasteleria.png" alt="Pastelería" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Pastelería</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Desayunos */}
                        <FadeIn delay={0.15} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Desayunos">
                                <Image src="/images/categories/desayunos.png" alt="Desayunos" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Desayunos</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Wraps */}
                        <FadeIn delay={0.2} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Wraps">
                                <Image src="/images/categories/wraps.png" alt="Wraps" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Wraps</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Empanadas */}
                        <FadeIn delay={0.25} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Empanadas">
                                <Image src="/images/categories/empanadas.png" alt="Empanadas" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Empanadas</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Jugos — ancho doble */}
                        <FadeIn delay={0.3} className="col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Jugos">
                                <Image src="/images/categories/jugos.png" alt="Jugos y Licuados" fill className="object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-6">
                                    <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Fríos & Naturales</span>
                                    <h3 className="text-white text-2xl font-black mt-0.5">Jugos & Licuados</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Pastas */}
                        <FadeIn delay={0.35} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Pastas">
                                <Image src="/images/categories/pastas.png" alt="Pastas" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Pastas</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Postres */}
                        <FadeIn delay={0.4} className="relative rounded-3xl overflow-hidden group cursor-pointer h-44">
                            <Link href="/menu?cat=Postres">
                                <Image src="/images/categories/postres.png" alt="Postres" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <h3 className="text-white text-lg font-black">Postres</h3>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Plato del Día — ancho doble */}
                        <FadeIn delay={0.45} className="col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer h-52">
                            <Link href="/menu?cat=Plato del Día">
                                <Image src="/images/categories/platos-diarios.png" alt="Plato del Día" fill className="object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
                                <div className="absolute inset-0 flex flex-col justify-center p-7">
                                    <span className="text-orange-300 text-xs font-black uppercase tracking-widest mb-1">⭐ Destacado</span>
                                    <h3 className="text-white text-3xl font-black tracking-tight leading-tight">Plato del Día</h3>
                                    <p className="text-white/60 text-sm mt-1">El favorito de hoy · Bebida incluida</p>
                                </div>
                            </Link>
                        </FadeIn>

                        {/* Promociones — ancho doble */}
                        <FadeIn delay={0.5} className="col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer h-52">
                            <Link href="/menu?cat=Promociones">
                                <Image src="/images/categories/promociones.png" alt="Promociones" fill className="object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
                                <div className="absolute inset-0 flex flex-col justify-center p-7">
                                    <span className="text-yellow-300 text-xs font-black uppercase tracking-widest mb-1">🔥 Ofertas</span>
                                    <h3 className="text-white text-3xl font-black tracking-tight leading-tight">Promociones</h3>
                                    <p className="text-white/60 text-sm mt-1">Combos y descuentos del día</p>
                                </div>
                            </Link>
                        </FadeIn>

                    </div>
                </div>
            </section>

            {/* --- FEATURED DISHES SPLIT SECTION --- */}
            <section className="py-24 bg-[#FAF7F2] overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <FadeIn className="lg:w-1/2 relative">
                            <div className="relative aspect-square w-full max-w-lg mx-auto transform rotate-3 hover:rotate-0 transition-all duration-700">
                                <Image
                                    src="/images/latte_swirl_1768310553394.png"
                                    alt="Latte Art Bloom"
                                    fill
                                    className="object-cover rounded-[2.5rem] shadow-2xl"
                                />
                                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 max-w-xs animate-bounce-slow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="text-orange-500 fill-orange-500" size={16} />
                                        <span className="font-bold text-sm">Lo más pedido</span>
                                    </div>
                                    <p className="font-bold text-gray-900 text-lg">Submarino</p>
                                    <p className="text-gray-500 text-sm">Chocolate artesanal con leche caliente. El favorito.</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn className="lg:w-1/2 space-y-8">
                            <span className="text-orange-600 font-bold tracking-widest uppercase text-sm">Nuestra Carta</span>
                            <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-[1.1]">
                                Sabores que <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">te despiertan.</span>
                            </h2>
                            <p className="text-xl text-gray-500 leading-relaxed">
                                Desde el espresso clásico hasta opciones con leches vegetales, pasando por wraps, tostados y una pastelería que cambia cada semana. Hay algo para cada momento del día.
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
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>

                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                                ¿Con ganas de un café?
                            </h2>
                            <p className="text-gray-400 text-xl font-medium mb-0">
                                Pedí ahora desde nuestra web y recibí en tu puerta. Sin esperas.
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
            <footer className="bg-[#FAF7F2] border-t border-amber-100/60 pt-20 pb-10">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tighter">BLOOM.</h3>
                            <p className="text-gray-500 max-w-sm mb-6">
                                Café de especialidad, pastelería artesanal y mucho más. <br />
                                Te esperamos para compartir un buen momento.
                            </p>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"></div>
                                <div className="w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Ubicación</h4>
                            <ul className="space-y-2 text-gray-500">
                                <li className="flex gap-2"><MapPin size={18} /> Almirante Brown 2005</li>
                                <li>Mar del Plata, Argentina</li>
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

                    <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
                        <span>&copy; 2026 Bloom Restaurant. Todos los derechos reservados.</span>
                        <button
                            onClick={() => setShowLogin(true)}
                            className="opacity-0 hover:opacity-40 transition-opacity w-7 h-7 flex items-center justify-center"
                        >
                            <LogIn size={13} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            </footer>
        </main>
    );
}
