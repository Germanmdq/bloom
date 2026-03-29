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
import { FoodKingMobileNavButton, FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";

/** Video de fondo del hero: colocar el archivo en /public/videos/ (p. ej. hero-bloom.mp4). */
const HERO_VIDEO_SRC = "/videos/hero-bloom.mp4";

/** Hero: fotos propias en /public/images/hero (café primero, luego platos). Fallback si el video no carga. */
const U = {
  heroCafe: "/images/hero/hero-cafe-croissants.png",
  heroFood1: "/images/hero/hero-tostadas.png",
  heroFood2: "/images/hero/hero-wrap.png",
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
    bg: U.heroCafe,
    eyebrow: "Mar del Plata · Argentina",
    line: "Café de especialidad, pastelería artesanal y mucho más.",
    title: "BLOOM",
    accent: ".",
  },
  {
    bg: U.heroFood1,
    eyebrow: "Nuestra carta",
    line: "Desayunos, almuerzo, pastas, milanesas y platos del día.",
    title: "Mucho más",
    accent: " que un café.",
  },
  {
    bg: U.heroFood2,
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

const comboOffersFallback = [
  { t: "Combo desayuno: café + medialunas o tostados", img: U.catDesayunos },
  { t: "Promo almuerzo: plato del día + bebida", img: U.catPlatos },
  { t: "Merienda Bloom: café + pastelería seleccionada", img: U.catPasteleria },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

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
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-bloom-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-bloom-600 px-8 pt-10 pb-8 text-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-bloom-gold rounded-full blur-[80px] opacity-25 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white"
          >
            <X size={18} />
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">
            BLOOM<span className="text-bloom-gold">.</span>
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
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-bloom-600/20 focus:border-bloom-600/40 outline-none transition-all font-medium text-neutral-900"
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
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-bloom-600/20 focus:border-bloom-600/40 outline-none transition-all font-medium text-neutral-900"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-sm font-semibold text-center bg-red-50 py-2 rounded-xl">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bloom-600 text-white font-bold py-4 rounded-xl hover:bg-bloom-700 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      BLOOM<span className="text-english-600">.</span>
    </span>
  );
}

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [platoDiaProduct, setPlatoDiaProduct] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
  } | null>(null);
  const [promoProducts, setPromoProducts] = useState<
    { id: string; name: string; description: string | null; price: number; image_url: string | null }[]
  >([]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: settings } = await supabase.from("app_settings").select("plato_del_dia_id").eq("id", 1).maybeSingle();
      if (settings?.plato_del_dia_id) {
        const { data: p } = await supabase
          .from("products")
          .select("id, name, description, price, image_url")
          .eq("id", settings.plato_del_dia_id)
          .eq("active", true)
          .maybeSingle();
        if (p) {
          setPlatoDiaProduct({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price) || 0,
            image_url: p.image_url,
          });
        }
      }
      const { data: promoCats } = await supabase.from("categories").select("id, name").ilike("name", "%promociones%");
      const promoCatId = promoCats?.[0]?.id;
      if (promoCatId) {
        const { data: promos } = await supabase
          .from("products")
          .select("id, name, description, price, image_url")
          .eq("category_id", promoCatId)
          .eq("active", true)
          .order("name")
          .limit(9);
        if (promos?.length) {
          setPromoProducts(
            promos.map((x) => ({
              id: x.id,
              name: x.name,
              description: x.description,
              price: Number(x.price) || 0,
              image_url: x.image_url,
            }))
          );
        }
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-bloom-page text-neutral-900 font-sans selection:bg-bloom-200 selection:text-neutral-900">
      <AnimatePresence>{showLogin && <LoginModal onClose={() => setShowLogin(false)} />}</AnimatePresence>
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="bg-english-800 text-bloom-cream text-[11px] sm:text-sm font-semibold border-b border-english-900/60">
        <div className="container mx-auto px-4 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
            <span className="inline-flex items-start gap-1.5 min-w-0">
              <MapPin size={14} className="shrink-0 mt-0.5 text-bloom-gold" />
              <span className="leading-snug">{CONTACT.address}, {CONTACT.city}</span>
            </span>
            <a href={`mailto:${CONTACT.email}`} className="hover:underline truncate text-left sm:max-w-none text-bloom-cream/95">
              {CONTACT.email}
            </a>
            <span className="text-bloom-cream/85 sm:text-bloom-cream/90">{CONTACT.hours}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:justify-end shrink-0">
            <a href={CONTACT.phoneHref} className="inline-flex items-center gap-1.5 font-bold hover:underline hover:text-bloom-gold">
              <Phone size={14} className="shrink-0" />
              <span className="whitespace-nowrap">{CONTACT.phoneDisplay}</span>
            </a>
            <Link href="/about" className="hover:underline font-bold hover:text-bloom-gold">
              Contacto
            </Link>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-shadow duration-300 border-b border-english-100/80 ${
          scrolled ? "bg-white shadow-md" : "bg-white/95 backdrop-blur-md shadow-sm"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between gap-2 sm:gap-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <LogoWordmark />
          </Link>
          <nav className="hidden xl:flex items-center gap-8 text-[15px] font-bold text-neutral-700">
            <Link href="/" className="text-bloom-600">
              Inicio
            </Link>
            <Link href="/menu" className="hover:text-bloom-600 transition-colors">
              Menú
            </Link>
            <Link href="/about" className="hover:text-bloom-600 transition-colors">
              Nosotros
            </Link>
            <Link href="/reservations" className="hover:text-bloom-600 transition-colors">
              Reservas
            </Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <FoodKingMobileNavButton onOpen={() => setMobileNavOpen(true)} />
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-bloom-600 px-3 py-2 sm:px-5 sm:py-2.5 text-[11px] sm:text-sm font-bold text-white shadow hover:bg-bloom-700 transition-colors whitespace-nowrap"
            >
              <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
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

      <section className="relative min-h-[min(90vh,840px)] h-[min(90vh,840px)] w-full overflow-hidden bg-neutral-950">
        {heroVideoFailed ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Image
                src={heroSlides[slide].bg}
                alt=""
                fill
                className="object-cover object-center scale-[1.02]"
                priority={slide === 0}
                sizes="100vw"
                quality={88}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-english-950/75 via-black/35 to-transparent sm:from-english-950/65" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" aria-hidden />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0">
            <video
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.02]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={U.heroCafe}
              aria-hidden
              onError={() => setHeroVideoFailed(true)}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-br from-english-950/75 via-black/35 to-transparent sm:from-english-950/65" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" aria-hidden />
          </div>
        )}

        <div className="relative z-10 h-full flex flex-col justify-center container mx-auto px-4 md:px-6 pb-16 sm:pb-20">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="max-w-2xl text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.35)]"
          >
            <p className="text-bloom-cream/95 font-bold uppercase tracking-[0.18em] text-xs sm:text-sm mb-3">
              {heroSlides[slide].eyebrow}
            </p>
            <p className="text-white/92 text-base sm:text-lg md:text-xl font-medium leading-snug mb-5 max-w-xl">
              {heroSlides[slide].line}
            </p>
            <h1 className="text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.06] tracking-tight mb-8">
              {heroSlides[slide].title}
              <span className="text-bloom-cream">{heroSlides[slide].accent}</span>
            </h1>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-600 px-7 sm:px-8 py-3.5 sm:py-4 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-[0_12px_40px_-8px_rgba(122,118,90,0.5)] hover:bg-bloom-700 transition-colors"
            >
              Ver menú
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </motion.div>

          <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex justify-center gap-2 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${slide === i ? "w-9 sm:w-10 bg-bloom-cream" : "w-2 bg-white/35 hover:bg-white/60"}`}
                aria-label={`Diapositiva ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-bloom-page">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2">Nuestra carta</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight">Elegí por categoría</h2>
            <p className="text-neutral-600 mt-3 text-lg">Lo mejor de Bloom, ordenado para que encuentres al toque.</p>
          </FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categoryCards.map((c, i) => (
              <FadeIn key={c.title} delay={i * 0.05}>
                <Link
                  href={c.href}
                  className="group block rounded-3xl bg-white border border-bloom-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-b from-bloom-50 to-white">
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
            <p className="text-bloom-gold font-bold uppercase tracking-widest text-sm mb-2">Destacado</p>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              {platoDiaProduct ? (
                <>
                  <span className="block sm:inline">{platoDiaProduct.name}</span>
                </>
              ) : (
                <>
                  PLATO DEL <span className="text-bloom-gold">DÍA</span>
                </>
              )}
            </h2>
            <p className="text-neutral-400 text-lg font-medium mb-4 max-w-lg">
              {platoDiaProduct?.description?.trim()
                ? platoDiaProduct.description
                : "Elegí el plato del día desde Ajustes del panel para mostrarlo acá. Mientras tanto, explorá la carta con opciones caseras."}
            </p>
            {platoDiaProduct && (
              <p className="text-bloom-gold font-black text-2xl mb-6">{formatCurrency(platoDiaProduct.price)}</p>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-bloom-gold text-neutral-900 px-4 py-2 font-black text-sm mb-8">
              {platoDiaProduct ? "Marcado en Ajustes · Bloom" : "Consultá promos en el menú"}
            </div>
            <Link
              href="/menu?cat=Plato%20del%20Día"
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 px-8 py-3.5 font-black text-sm uppercase hover:bg-bloom-gold transition-colors"
            >
              Ver en el menú
            </Link>
          </div>
          <div className="flex-1 flex justify-center w-full">
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl bg-neutral-800">
              <Image
                src={platoDiaProduct?.image_url || U.promoPlato}
                alt={platoDiaProduct?.name ?? "Plato del día Bloom"}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 400px"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2">Bloom</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900">Favoritos de la casa</h2>
            <p className="text-neutral-600 mt-3 max-w-xl mx-auto">Precios y disponibilidad en el menú online.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {destacados.map((p, i) => {
              const card =
                platoDiaProduct && p.name === "Plato del día"
                  ? {
                      name: platoDiaProduct.name,
                      desc:
                        (platoDiaProduct.description || "").trim().slice(0, 120) ||
                        "Plato destacado — pedilo desde el menú online.",
                      img: platoDiaProduct.image_url || U.promoPlato,
                    }
                  : p;
              return (
                <FadeIn key={card.name + String(i)} delay={(i % 4) * 0.05}>
                  <div className="group rounded-3xl border border-neutral-100 bg-bloom-page overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative aspect-square">
                      <Image
                        src={card.img}
                        alt={card.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, 25vw"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-neutral-900 text-lg leading-snug mb-2">{card.name}</h3>
                      <p className="text-neutral-600 text-sm mb-4 min-h-[2.5rem]">{card.desc}</p>
                      <Link
                        href={platoDiaProduct && p.name === "Plato del día" ? "/menu?cat=Plato%20del%20Día" : "/menu"}
                        className="block w-full text-center rounded-full border-2 border-bloom-600 text-bloom-600 font-bold py-2.5 hover:bg-bloom-600 hover:text-white transition-colors text-sm uppercase"
                      >
                        Ver en menú
                      </Link>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <Link href="/menu" className="inline-flex items-center gap-2 font-black text-bloom-600 hover:underline uppercase text-sm tracking-wide">
              Ver menú completo
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#fff5e6] border-y border-amber-100">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-10">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2">Promociones</p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900">Combos y ofertas</h2>
            <p className="text-neutral-600 mt-2">Aplican según día y stock — detalle en carta.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {promoProducts.length > 0
              ? promoProducts.map((o) => (
                  <FadeIn key={o.id}>
                    <Link
                      href="/menu?cat=Promociones"
                      className="block rounded-3xl bg-white p-2 shadow-md border border-bloom-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow h-full"
                    >
                      <div className="relative aspect-[16/10] w-full bg-bloom-50">
                        <Image
                          src={o.image_url || U.catPlatos}
                          alt={o.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                      <div className="p-5 text-center flex flex-col flex-1">
                        <p className="font-black text-neutral-900 text-lg leading-tight mb-1">{o.name}</p>
                        {o.description?.trim() ? (
                          <p className="text-neutral-600 text-sm mb-3 line-clamp-2">{o.description}</p>
                        ) : null}
                        <p className="text-bloom-600 font-black text-lg mt-auto">{formatCurrency(o.price)}</p>
                      </div>
                    </Link>
                  </FadeIn>
                ))
              : comboOffersFallback.map((o) => (
                  <FadeIn key={o.t}>
                    <div className="rounded-3xl bg-white p-2 shadow-md border border-bloom-200 overflow-hidden flex flex-col">
                      <div className="relative aspect-[16/10] w-full">
                        <Image src={o.img} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      </div>
                      <p className="font-bold text-neutral-800 leading-snug p-5 text-center">{o.t}</p>
                    </div>
                  </FadeIn>
                ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/menu?cat=Promociones" className="text-bloom-600 font-black hover:underline">
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
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bloom-gold/20 text-bloom-600">
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
              <p className="text-bloom-gold font-bold uppercase tracking-widest text-sm mb-2">Sobre Bloom</p>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                Donde la calidad se cruza con <span className="text-bloom-gold">un buen momento.</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-8">
                Café de especialidad, pastelería artesanal, platos del día y opciones para cada hora. Un espacio en Mar del Plata pensado para compartir, trabajar tranquilo o pedir y llevar.
              </p>
              <ul className="space-y-4 mb-10">
                {["Ambiente cuidado y atención cercana", "Menú amplio: desayuno, almuerzo y merienda"].map((x) => (
                  <li key={x} className="flex items-center gap-3 font-bold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bloom-gold text-neutral-900 text-sm">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-bloom-gold px-8 py-3.5 font-black text-neutral-900 text-sm uppercase hover:bg-bloom-gold-dark transition-colors"
              >
                Conocer más
                <ArrowRight size={18} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-bloom-page">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <FadeIn>
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2">Clientes</p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900 mb-10">La experiencia de quienes nos eligen</h2>
            <div className="rounded-3xl bg-white border border-bloom-200 shadow-lg p-8 md:p-12">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-6 h-6 text-bloom-gold fill-bloom-gold" />
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

      <section className="py-16 bg-gradient-to-br from-english-800 via-english-900 to-bloom-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <p className="text-bloom-gold font-bold uppercase tracking-widest text-sm mb-2">Merienda & café</p>
              <h2 className="text-3xl md:text-4xl font-black mb-6">Pedí tu combo favorito</h2>
              <p className="text-white/85 mb-8 max-w-lg">
                Pastelería del día, sandwiches calientes y bebidas para acompañar. Ideal para compartir o para darte un gustito a la tarde.
              </p>
              <Link
                href="/menu?cat=Pastelería"
                className="inline-flex items-center gap-2 rounded-full bg-bloom-gold px-8 py-3.5 font-black text-neutral-900 text-sm uppercase hover:bg-bloom-gold-dark transition-colors"
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

      <section className="py-16 md:py-24 bg-bloom-page">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative w-full">
            <div className="relative w-full max-w-lg mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
              <Image src={U.delivery} alt="Delivery Bloom" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
          <FadeIn className="lg:w-1/2 text-center lg:text-left">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2">Pedidos online</p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6">Delivery en la ciudad</h2>
            <p className="text-neutral-600 text-lg mb-8 max-w-lg">
              Hacé tu pedido desde la web y coordinamos el envío. Horarios y zonas según disponibilidad del día.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-600 px-8 py-4 font-black text-white text-sm uppercase hover:bg-bloom-700 transition-colors"
            >
              <Bike size={20} />
              Pedir ahora
            </Link>
          </FadeIn>
        </div>
      </section>

      <section id="contact" className="py-16 bg-[#1a1a1a] text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Clock className="mx-auto mb-4 text-bloom-gold" size={40} />
          <h2 className="text-2xl md:text-4xl font-black mb-4">¿Reservas o consultas?</h2>
          <p className="text-neutral-400 font-semibold mb-2">Escribinos o llamanos</p>
          <a href={CONTACT.phoneHref} className="text-2xl md:text-3xl font-black text-bloom-gold hover:underline block">
            {CONTACT.phoneDisplay}
          </a>
          <p className="text-neutral-500 mt-4">
            <a href={`mailto:${CONTACT.email}`} className="hover:text-bloom-gold">
              {CONTACT.email}
            </a>
            {" · "}
            {CONTACT.address}, {CONTACT.city}
          </p>
          <div className="mt-10">
            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-gold px-10 py-4 font-black text-neutral-900 text-sm uppercase hover:bg-bloom-gold-dark transition-colors"
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
              <Link href="/menu" className="hover:text-bloom-gold">
                Menú
              </Link>
              <Link href="/about" className="hover:text-bloom-gold">
                Nosotros
              </Link>
              <Link href="/reservations" className="hover:text-bloom-gold">
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
