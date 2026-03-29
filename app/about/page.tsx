"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Instagram, ArrowLeft } from "lucide-react";

// ===========================================
// DATA
// ===========================================
const HERO_IMAGE = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2574&auto=format&fit=crop";

const STORY_P1 =
  "Bloom es una cafetería familiar creada por Bárbara y Agustín como un proyecto lleno de amor, desafío y vocación. Somos un espacio cálido y de encuentro, donde ofrecemos cafés clásicos, sabores tradicionales y comidas caseras, elaboradas con ingredientes de calidad y ese toque hogareño que te hace sentir como en casa.";

const STORY_P2 =
  "Nuestros hijos forman parte de nuestro día a día, y esa esencia familiar se refleja en el ambiente, en el equipo y en la forma en que recibimos a cada cliente. En Bloom buscamos que todos se sientan bienvenidos, cómodos y felices de volver.";

const LOCATIONS = [
  {
    id: 1,
    title: "Bloom · Mar del Plata",
    address: "Almirante Brown 2005",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  },
];

// ===========================================
// COMPONENTS
// ===========================================

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-6">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
          <ArrowLeft size={20} />
          <span className="text-xs font-bold tracking-widest uppercase">Volver al inicio</span>
        </Link>
        <h1 className="font-sans text-2xl font-black tracking-widest text-white">BLOOM</h1>
        <div className="w-20" /> {/* Spacer */}
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="relative w-full h-[60vh] overflow-hidden bg-piedra">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-piedra" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-crema p-4 mt-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
          <p className="font-sans text-sm tracking-[0.3em] font-medium mb-4 text-gris">NUESTRA HISTORIA</p>
          <h2 className="font-sans text-4xl md:text-6xl font-black tracking-tight uppercase mb-8 leading-[1.1]">
            FAMILIA, CAFÉ<br /><span className="text-chocolate">Y VOCACIÓN</span>
          </h2>
          <p className="max-w-2xl mx-auto text-white/85 leading-relaxed font-light text-base md:text-lg">
            {STORY_P1}
          </p>
        </motion.div>
      </div>
    </header>
  );
}

function StoryBody() {
  return (
    <section className="py-16 md:py-20 bg-white text-piedra border-y border-chocolate/10">
      <div className="container mx-auto px-6 max-w-3xl">
        <p className="font-sans text-lg md:text-xl leading-relaxed text-piedra/90 mb-8">{STORY_P2}</p>
      </div>
    </section>
  );
}

function Locations() {
  return (
    <section className="py-20 bg-crema text-piedra">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h3 className="font-sans text-3xl font-bold tracking-widest uppercase text-chocolate">Dónde estamos</h3>
          <div className="w-16 h-1 bg-chocolate mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-md mx-auto">
          {LOCATIONS.map(loc => (
            <motion.div key={loc.id} whileHover={{ y: -5 }} className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl mb-6 shadow-xl shadow-chocolate/10">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${loc.image})` }} />
                <div className="absolute inset-0 bg-chocolate/0 group-hover:bg-chocolate/20 transition-colors" />
              </div>
              <div className="text-center">
                <h4 className="font-sans text-piedra text-xl font-black tracking-widest mb-2">{loc.title}</h4>
                <div className="flex items-center justify-center gap-2 text-gris text-sm font-medium tracking-wide">
                  <MapPin size={14} />
                  <span>{loc.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-piedra text-crema py-16 border-t border-white/5">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h2 className="font-sans text-2xl font-black tracking-widest mb-2">BLOOM</h2>
          <p className="text-gris text-sm">Café de especialidad & pastelería.</p>
        </div>
        <div className="flex gap-6">
          <Link href="https://instagram.com" target="_blank" className="hover:text-chocolate transition-colors"><Instagram /></Link>
        </div>
        <p className="text-xs text-gris">© 2026 Bloom Cafe.</p>
      </div>
    </footer>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-crema selection:bg-chocolate selection:text-crema">
      <Navbar />
      <Hero />
      <StoryBody />
      <Locations />
      <Footer />
    </main>
  );
}
