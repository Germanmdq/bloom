"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bike,
  ChefHat,
  Clock,
  Coffee,
  Leaf,
  LogIn,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/** Imágenes (Unsplash) — mismo estilo visual; reemplazá por assets en /public cuando los tengas. */
const U = {
  hero1: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&q=85",
  hero2: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1920&q=85",
  hero3: "https://images.unsplash.com/photo-1550617931-e01a993fe264?auto=format&fit=crop&w=1920&q=85",
  catPlatos: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85",
  catPasteleria: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=85",
  catDesayunos: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=85",
  catJugos: "https://images.unsplash.com/photo-1622597467836-f3285f2131b9?auto=format&fit=crop&w=800&q=85",
  promoPlato: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85",
  featLatte: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=85",
  featWrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=85",
  featEmpanadas: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=85",
  delivery: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=85",
  combo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85",
};

const CONTACT = {
  address: "Almirante Brown 2005",
  city: "Mar del Plata, Argentina",
  email: "reservas@bloom.com",
  phoneDisplay: "+54 9 223 123-4567",
  phoneHref: "tel:+5492231234567",
  hours: "Lun–Dom · 08:00–22:00",
};

const heroSlides = [
  {
    bg: U.hero1,
    eyebrow: "Mar del Plata · Argentina",
    line: "Café de especialidad, pastelería artesanal y mucho más.",
    title: "BLOOM",
    accent: ".",
  },
  {
    bg: U.hero2,
    eyebrow: "Nuestra carta",
    line: "Desayunos, almuerzo, pastas, milanesas y platos del día.",
    title: "Mucho más",
    accent: " que un café.",
  },
  {
    bg: U.hero3,
    eyebrow: "Pedí online",
    line: "Recibí en tu puerta sin vueltas.",
    title: "Delivery",
    accent: " en la ciudad.",
  },
];

const categoryCards = [
  { title: "Platos del día", hint: "Almuerzo y cena", img: U.catPlatos, href: "/menu?cat=Platos%20Diarios" },
  { title: "Pastelería", hint: "Tortas y dulces", img: U.catPasteleria, href: "/menu?cat=Pastelería" },
  { title: "Desayunos", hint: "Café y medialunas", img: U.catDesayunos, href: "/menu?cat=Desayunos" },
  { title: "Jugos y licuados", hint: "Fríos y naturales", img: U.catJugos, href: "/menu?cat=Jugos" },
];

const destacados = [
  { name: "Submarino", desc: "Chocolate artesanal con leche caliente.", img: U.featLatte },
  { name: "Wraps", desc: "Frescos, abundantes y para llevar.", img: U.featWrap },
  { name: "Empanadas", desc: "Clásicas argentinas, siempre recién horneadas.", img: U.featEmpanadas },
  { name: "Plato del día", desc: "El favorito de la casa con bebida incluida.", img: U.promoPlato },
];

const comboOffers = [
  { t: "Combo desayuno: café + medialunas o tostados", img: U.catDesayunos },
  { t: "Promo almuerzo: plato del día + bebida", img: U.catPlatos },
  { t: "Merienda Bloom: café + pastelería seleccionada", img: U.catPasteleria },
];

const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-[#c41e3a] px-8 pt-10 pb-8 text-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#ffc107] rounded-full blur-[80px] opacity-25 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white"
          >
            <X size={18} />
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">
            BLOOM<span className="text-[#ffc107]">.</span>
          </h2>
          <p className="text-white/80 text-sm font-semibold">Acceso para empleados</p>
        </div>

        <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#c41e3a]/20 focus:border-[#c41e3a]/40 outline-none transition-all font-medium text-neutral-900"
              placeholder="nombre@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-[#c41e3a]/20 focus:border-[#c41e3a]/40 outline-none transition-all font-medium text-neutral-900"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-sm font-semibold text-center bg-red-50 py-2 rounded-xl">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c41e3a] text-white font-bold py-4 rounded-xl hover:bg-[#a01830] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {loading ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LogoWordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`font-black text-xl md:text-2xl tracking-tighter ${inverted ? "text-white" : "text-neutral-900"}`}>
      BLOOM<span className="text-[#ffc107]">.</span>
    </span>
  );
}

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#fffdf8] text-neutral-900 font-sans selection:bg-[#ffc107] selection:text-neutral-900">
      <AnimatePresence>{showLogin && <LoginModal onClose={() => setShowLogin(false)} />}</AnimatePresence>

      <div className="bg-[#ffc107] text-neutral-900 text-xs sm:text-sm font-semibold">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" />
              {CONTACT.address}, {CONTACT.city}
            </span>
            <a href={`mailto:${CONTACT.email}`} className="hover:underline">
              {CONTACT.email}
            </a>
            <span className="hidden md:inline text-neutral-700">{CONTACT.hours}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={CONTACT.phoneHref} className="inline-flex items-center gap-1.5 font-bold hover:underline">
              <Phone size={14} />
              {CONTACT.phoneDisplay}
            </a>
            <Link href="/about" className="hidden sm:inline hover:underline">
              Contacto
            </Link>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-shadow duration-300 ${
          scrolled ? "bg-white shadow-md" : "bg-white/95 backdrop-blur-md shadow-sm"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <LogoWordmark />
          </Link>
          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-bold text-neutral-700">
            <Link href="/" className="text-[#c41e3a]">
              Inicio
            </Link>
            <Link href="/menu" className="hover:text-[#c41e3a] transition-colors">
              Menú
            </Link>
            <Link href="/about" className="hover:text-[#c41e3a] transition-colors">
              Nosotros
            </Link>
            <Link href="/reservations" className="hover:text-[#c41e3a] transition-colors">
              Reservas
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/menu"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#c41e3a] px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-[#a01830] transition-colors"
            >
              <ShoppingBag size={18} />
              Pedir ahora
            </Link>
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
              aria-label="Acceso staff"
            >
              <LogIn size={20} />
            </button>
          </div>
        </div>
      </header>

      <section className="relative h-[min(88vh,820px)] w-full overflow-hidden bg-neutral-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0"
          >
            <Image src={heroSlides[slide].bg} alt="" fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/25" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full flex flex-col justify-center container mx-auto px-4 md:px-6">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl text-white"
          >
            <p className="text-[#ffc107] font-bold uppercase tracking-[0.2em] text-sm mb-3">{heroSlides[slide].eyebrow}</p>
            <p className="text-white/90 text-lg md:text-xl font-medium mb-4">{heroSlides[slide].line}</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-8">
              {heroSlides[slide].title}
              <span className="text-[#ffc107]">{heroSlides[slide].accent}</span>
            </h1>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] px-8 py-4 text-neutral-900 font-black text-sm uppercase tracking-wide shadow-[0_12px_40px_-8px_rgba(255,193,7,0.55)] hover:bg-[#ffcd38] transition-colors"
            >
              Ver menú
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </motion.div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`h-2.5 rounded-full transition-all ${slide === i ? "w-10 bg-[#ffc107]" : "w-2.5 bg-white/40 hover:bg-white/70"}`}
                aria-label={`Diapositiva ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#fffdf8]">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-[#c41e3a] font-bold uppercase tracking-widest text-sm mb-2">Nuestra carta</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight">Elegí por categoría</h2>
            <p className="text-neutral-600 mt-3 text-lg">Lo mejor de Bloom, ordenado para que encuentres al toque.</p>
          </FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categoryCards.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.05}>
                <Link
                  href={c.href}
                  className="group block rounded-3xl bg-white border border-amber-100/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-b from-amber-50 to-white">
                    <Image
                      src={c.img}
                      alt={c.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                      <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">{c.hint}</p>
                      <h3 className="text-white text-lg font-black leading-tight">{c.title}</h3>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20 overflow-hidden bg-[#1a1a1a] text-white">
        <div className="absolute inset-0 opacity-[0.07] bg-[url('https://www.transparenttextures.com/patterns/food.png')]" />
        <div className="container mx-auto px-4 relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="text-[#ffc107] font-bold uppercase tracking-widest text-sm mb-2">Destacado</p>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              PLATO DEL <span className="text-[#ffc107]">DÍA</span>
            </h2>
            <p className="text-neutral-400 text-lg font-medium mb-6 max-w-lg">
              Platos caseros que rotan según la semana: milanesas, pastas y opciones livianas. Pedilo con bebida incluida cuando corresponda.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] text-neutral-900 px-4 py-2 font-black text-sm mb-8">
              Consultá promos en el menú
            </div>
            <Link
              href="/menu?cat=Plato%20del%20Día"
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 px-8 py-3.5 font-black text-sm uppercase hover:bg-[#ffc107] transition-colors"
            >
              Ver plato del día
            </Link>
          </div>
          <div className="flex-1 flex justify-center w-full">
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <Image src={U.promoPlato} alt="Plato del día Bloom" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 400px" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-[#c41e3a] font-bold uppercase tracking-widest text-sm mb-2">Bloom</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900">Favoritos de la casa</h2>
            <p className="text-neutral-600 mt-3 max-w-xl mx-auto">Precios y disponibilidad en el menú online.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {destacados.map((p, i) => (
              <FadeIn key={p.name} delay={(i % 4) * 0.05}>
                <div className="group rounded-3xl border border-neutral-100 bg-[#fffdf8] overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="relative aspect-square">
                    <Image src={p.img} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, 25vw" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-neutral-900 text-lg leading-snug mb-2">{p.name}</h3>
                    <p className="text-neutral-600 text-sm mb-4 min-h-[2.5rem]">{p.desc}</p>
                    <Link
                      href="/menu"
                      className="block w-full text-center rounded-full border-2 border-[#c41e3a] text-[#c41e3a] font-bold py-2.5 hover:bg-[#c41e3a] hover:text-white transition-colors text-sm uppercase"
                    >
                      Ver en menú
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/menu" className="inline-flex items-center gap-2 font-black text-[#c41e3a] hover:underline uppercase text-sm tracking-wide">
              Ver menú completo
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#fff5e6] border-y border-amber-100">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-10">
            <p className="text-[#c41e3a] font-bold uppercase tracking-widest text-sm mb-2">Promociones</p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900">Combos y ofertas</h2>
            <p className="text-neutral-600 mt-2">Aplican según día y stock — detalle en carta.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {comboOffers.map((o) => (
              <FadeIn key={o.t}>
                <div className="rounded-3xl bg-white p-2 shadow-md border border-amber-100 overflow-hidden flex flex-col">
                  <div className="relative aspect-[16/10] w-full">
                    <Image src={o.img} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                  </div>
                  <p className="font-bold text-neutral-800 leading-snug p-5 text-center">{o.t}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/menu?cat=Promociones" className="text-[#c41e3a] font-black hover:underline">
              Ver promociones
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Coffee, title: "Café de especialidad", body: "Granos seleccionados y preparación consistente en cada taza." },
              { icon: ChefHat, title: "Cocina y pastelería", body: "Recetas propias y elaboración diaria en la mayoría de nuestras opciones." },
              { icon: Truck, title: "Delivery", body: "Pedidos online para que disfrutes Bloom donde estés." },
              { icon: Leaf, title: "Ingredientes frescos", body: "Priorizamos calidad y estación en platos y jugos." },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="text-center px-2">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffc107]/20 text-[#c41e3a]">
                    <f.icon size={32} strokeWidth={2} />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wide text-neutral-900 mb-2">{f.title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{f.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#1a1a1a] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <FadeIn className="lg:w-1/2 relative w-full max-w-lg mx-auto">
              <div className="relative aspect-square rounded-3xl overflow-hidden">
                <Image src={U.featLatte} alt="Bloom café" fill className="object-cover" />
              </div>
            </FadeIn>
            <FadeIn className="lg:w-1/2">
              <p className="text-[#ffc107] font-bold uppercase tracking-widest text-sm mb-2">Sobre Bloom</p>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                Donde la calidad se cruza con <span className="text-[#ffc107]">un buen momento.</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-8">
                Café de especialidad, pastelería artesanal, platos del día y opciones para cada hora. Un espacio en Mar del Plata pensado para compartir, trabajar tranquilo o pedir y llevar.
              </p>
              <ul className="space-y-4 mb-10">
                {["Ambiente cuidado y atención cercana", "Menú amplio: desayuno, almuerzo y merienda"].map((x) => (
                  <li key={x} className="flex items-center gap-3 font-bold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffc107] text-neutral-900 text-sm">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] px-8 py-3.5 font-black text-neutral-900 text-sm uppercase hover:bg-[#ffcd38] transition-colors"
              >
                Conocer más
                <ArrowRight size={18} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-[#fffdf8]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <FadeIn>
            <p className="text-[#c41e3a] font-bold uppercase tracking-widest text-sm mb-2">Clientes</p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900 mb-10">La experiencia de quienes nos eligen</h2>
            <div className="rounded-3xl bg-white border border-amber-100 shadow-lg p-8 md:p-12">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-6 h-6 text-[#ffc107] fill-[#ffc107]" />
                ))}
              </div>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed mb-8">
                &ldquo;Excelente café y las tortas son un viaje de ida. Volvemos siempre que podemos; el servicio es súper atento.&rdquo;
              </p>
              <p className="font-black text-neutral-900 text-lg">María · Mar del Plata</p>
              <p className="text-neutral-500 text-sm font-semibold">Cliente frecuente</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-[#c41e3a] to-[#8b1428] text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <p className="text-[#ffc107] font-bold uppercase tracking-widest text-sm mb-2">Merienda & café</p>
              <h2 className="text-3xl md:text-4xl font-black mb-6">Pedí tu combo favorito</h2>
              <p className="text-white/85 mb-8 max-w-lg">
                Pastelería del día, sandwiches calientes y bebidas para acompañar. Ideal para compartir o para darte un gustito a la tarde.
              </p>
              <Link
                href="/menu?cat=Pastelería"
                className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] px-8 py-3.5 font-black text-neutral-900 text-sm uppercase hover:bg-[#ffcd38] transition-colors"
              >
                Ir al menú
              </Link>
            </FadeIn>
            <FadeIn>
              <div className="relative aspect-[4/3] max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl">
                <Image src={U.combo} alt="Comida Bloom" fill className="object-cover" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#fffdf8]">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative w-full">
            <div className="relative w-full max-w-lg mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
              <Image src={U.delivery} alt="Delivery Bloom" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
          <FadeIn className="lg:w-1/2 text-center lg:text-left">
            <p className="text-[#c41e3a] font-bold uppercase tracking-widest text-sm mb-2">Pedidos online</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6">Delivery en la ciudad</h2>
            <p className="text-neutral-600 text-lg mb-8 max-w-lg">
              Hacé tu pedido desde la web y coordinamos el envío. Horarios y zonas según disponibilidad del día.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-[#c41e3a] px-8 py-4 font-black text-white text-sm uppercase hover:bg-[#a01830] transition-colors"
            >
              <Bike size={20} />
              Pedir ahora
            </Link>
          </FadeIn>
        </div>
      </section>

      <section id="contact" className="py-16 bg-[#1a1a1a] text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Clock className="mx-auto mb-4 text-[#ffc107]" size={40} />
          <h2 className="text-2xl md:text-4xl font-black mb-4">¿Reservas o consultas?</h2>
          <p className="text-neutral-400 font-semibold mb-2">Escribinos o llamanos</p>
          <a href={CONTACT.phoneHref} className="text-2xl md:text-3xl font-black text-[#ffc107] hover:underline block">
            {CONTACT.phoneDisplay}
          </a>
          <p className="text-neutral-500 mt-4">
            <a href={`mailto:${CONTACT.email}`} className="hover:text-[#ffc107]">
              {CONTACT.email}
            </a>
            {" · "}
            {CONTACT.address}, {CONTACT.city}
          </p>
          <div className="mt-10">
            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffc107] px-10 py-4 font-black text-neutral-900 text-sm uppercase hover:bg-[#ffcd38] transition-colors"
            >
              Reservar mesa
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0d0d0d] text-neutral-400 py-14 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <LogoWordmark inverted />
            <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold">
              <Link href="/menu" className="hover:text-[#ffc107]">
                Menú
              </Link>
              <Link href="/about" className="hover:text-[#ffc107]">
                Nosotros
              </Link>
              <Link href="/reservations" className="hover:text-[#ffc107]">
                Reservas
              </Link>
            </div>
            <p className="text-xs text-center md:text-right max-w-sm">
              © {new Date().getFullYear()} Bloom · Café de especialidad y pastelería en Mar del Plata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="mx-auto mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors"
          >
            <LogIn size={12} />
            Staff
          </button>
        </div>
      </footer>
    </main>
  );
}
