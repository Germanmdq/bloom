"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, MapPin, Instagram, ArrowRight, User } from "lucide-react";

// ===========================================
// DATA MOCKS
// ===========================================
const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2574&auto=format&fit=crop", // Coffee
    title: "ESPECIALIDAD",
    subtitle: "EN CADA TAZA"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=2526&auto=format&fit=crop", // Bakery
    title: "ARTESANAL",
    subtitle: "HECHO A MANO"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop", // Ambience
    title: "MOMENTOS",
    subtitle: "PARA DISFRUTAR"
  }
];

const LOCATIONS = [
  {
    id: 1,
    title: "PALERMO",
    address: "Gorriti 1234",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "RECOLETA",
    address: "Av. Alvear 1890",
    image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "BELGRANO",
    address: "Juramento 2002",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 4,
    title: "SAN ISIDRO",
    address: "Libertador 15200",
    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800"
  }
];

// ===========================================
// COMPONENTS
// ===========================================

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"}`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Left: Hamburger */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <Menu className={`w-6 h-6 ${scrolled ? "text-[#334862]" : "text-white"}`} />
          <span className={`text-xs font-bold tracking-widest ${scrolled ? "text-[#334862]" : "text-white"}`}>MENÚ</span>
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className={`font-raleway text-3xl font-black tracking-[0.2em] ${scrolled ? "text-[#334862]" : "text-white"}`}>
            BLOOM
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className={`hidden md:flex items-center gap-2 text-xs font-bold tracking-widest hover:opacity-80 transition-opacity ${scrolled ? "text-[#334862]" : "text-white"}`}>
            <User className="w-4 h-4" />
            <span>ACCESO</span>
          </Link>
          <Link href="/dashboard" className={`flex md:hidden ${scrolled ? "text-[#334862]" : "text-white"}`}>
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="relative w-full h-screen overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_SLIDES[current].image})` }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
        <motion.div
          key={`text-${current}`}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <p className="font-raleway text-sm md:text-lg tracking-[0.3em] font-medium mb-4">{HERO_SLIDES[current].subtitle}</p>
          <h2 className="font-raleway text-5xl md:text-8xl font-thin tracking-[0.1em] uppercase shadow-black drop-shadow-lg">
            {HERO_SLIDES[current].title}
          </h2>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
        >
          <span className="text-[10px] tracking-widest uppercase opacity-70">Descubrí más</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
        </motion.div>
      </div>

      {/* Dots */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${current === idx ? "bg-white scale-150" : "bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </header>
  );
}

function Locations() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-4 mb-16">
          <div className="h-[1px] w-12 bg-[#334862]/20" />
          <h3 className="font-raleway text-2xl md:text-3xl text-[#334862] font-light tracking-[0.2em] uppercase">Nuestros Locales</h3>
          <div className="h-[1px] w-12 bg-[#334862]/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {LOCATIONS.map(loc => (
            <motion.div
              key={loc.id}
              whileHover={{ y: -10 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] overflow-hidden mb-6">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${loc.image})` }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="text-center">
                <h4 className="font-raleway text-[#334862] text-xl font-bold tracking-widest mb-2">{loc.title}</h4>
                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-opensans tracking-wide">
                  <MapPin size={12} />
                  <span>{loc.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <button className="px-10 py-4 border border-[#334862] text-[#334862] font-raleway text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#334862] hover:text-white transition-colors duration-300">
            Ver todas las sucursales
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#334862] text-white py-20">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
        <div>
          <h2 className="font-raleway text-2xl font-black tracking-[0.2em] mb-6">BLOOM</h2>
          <p className="font-opensans text-sm text-white/60 leading-relaxed max-w-xs mx-auto md:mx-0">
            Café de especialidad y pastelería artesanal. Creando momentos únicos en cada detalle.
          </p>
        </div>

        <div className="flex flex-col gap-4 items-center md:items-start font-raleway text-xs font-bold tracking-widest">
          <Link href="#" className="hover:text-[#FBB03B] transition-colors">SOBRE NOSOTROS</Link>
          <Link href="#" className="hover:text-[#FBB03B] transition-colors">PRODUCTOS</Link>
          <Link href="#" className="hover:text-[#FBB03B] transition-colors">FRANQUICIAS</Link>
          <Link href="#" className="hover:text-[#FBB03B] transition-colors">CONTACTO</Link>
        </div>

        <div className="flex flex-col items-center md:items-end gap-6">
          <div className="flex gap-4">
            <Instagram className="w-6 h-6 hover:text-[#FBB03B] transition-colors cursor-pointer" />
            {/* Add more icons if needed */}
          </div>
          <p className="font-opensans text-xs text-white/40">
            © {new Date().getFullYear()} Bloom Cafe. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-[#FBB03B] selection:text-white">
      <Navbar />
      <Hero />
      <Locations />
      <Footer />
    </main>
  );
}
