"use client";

/** Tipografía: Inter desde `app/layout.tsx` (variable `--font-inter`). Esta página no importa `next/font`; el `<main>` usa `font-sans`. */

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bike,
  ChefHat,
  Clock,
  Coffee,
  Cookie,
  Leaf,
  Star,
  Truck,
  UtensilsCrossed,
  GlassWater,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { BloomChat, type BloomChatHandle } from "@/components/Menu/BloomChat";

/** Video de fondo del hero: colocar el archivo en /public/videos/ (p. ej. hero-bloom.mp4). */
const HERO_VIDEO_SRC = "/videos/hero-bloom.mp4";
/** Logo PNG con tipografía marrón bloom-600 y fondo transparente (ver scripts/process-bloom-logo.mjs). */
const HERO_LOGO_SRC = "/images/bloom-logo.png";

const U = {
  /** Flat lay marca — sección Sobre Bloom en home */
  sobreBloom: "/images/sobre-bloom-cafe.png",
  delivery: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=85",
};

const CONTACT = {
  address: "Almirante Brown 2005",
  city: "Mar del Plata, Argentina",
  email: "reservas@bloom.com",
  phoneDisplay: "+54 9 223 123-4567",
  phoneHref: "tel:+5492231234567",
  hours: "Lun–Dom · 08:00–22:00",
};

const categoryCards: { title: string; hint: string; href: string; Icon: LucideIcon }[] = [
  { title: "Cafetería", hint: "Cafés y bebidas calientes", href: "/menu?cat=Cafetería", Icon: Coffee },
  { title: "Comidas", hint: "Platos del día y más", href: "/menu?cat=Platos%20Diarios", Icon: UtensilsCrossed },
  { title: "Bebidas", hint: "Bebidas frías", href: "/menu?cat=Bebidas", Icon: GlassWater },
  { title: "Pastelería", hint: "Dulces y panificados", href: "/menu?cat=Pastelería", Icon: Cookie },
];

const destacados: { name: string; desc: string; img: string; nameHint: string }[] = [
  {
    name: "Los wraps",
    desc: "Recién armados, frescos y para llevar.",
    img: "/images/categories/wraps.png",
    nameHint: "wrap",
  },
  {
    name: "Las ensaladas",
    desc: "Verdes, completas y con aderezos de la casa.",
    img: "/images/categories/ensaladas.png",
    nameHint: "ensalada",
  },
  {
    name: "Arroz con pollo",
    desc: "Un clásico de la cocina, abundante y casero.",
    img: "/images/categories/platos-diarios.png",
    nameHint: "arroz",
  },
  {
    name: "Tostado pan árabe",
    desc: "Crocante, bien dorado, ideal para desayunar o merendar.",
    img: "/images/categories/desayunos.png",
    nameHint: "tostado",
  },
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

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bloomChatRef = useRef<BloomChatHandle>(null);
  const [favoriteProductIdByName, setFavoriteProductIdByName] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const maxWait = window.setTimeout(() => setHeroVideoReady(true), 12000);
    return () => window.clearTimeout(maxWait);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const next: Record<string, string | null> = {};
      for (const d of destacados) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("active", true)
          .ilike("name", `%${d.nameHint}%`)
          .limit(1)
          .maybeSingle();
        next[d.name] = data?.id ?? null;
      }
      setFavoriteProductIdByName(next);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-bloom-page text-neutral-900 font-sans selection:bg-bloom-200 selection:text-neutral-900">
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <SiteHeader scrolled={scrolled} onMobileNavOpen={() => setMobileNavOpen(true)} activeNav="home" />

      <section className="relative min-h-[min(90vh,840px)] h-[min(90vh,840px)] w-full overflow-hidden bg-neutral-950">
        <div className="absolute inset-0 bg-neutral-950">
          <video
            className="absolute inset-0 h-full w-full object-cover object-center scale-[1.02] bg-neutral-950"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            onCanPlay={() => setHeroVideoReady(true)}
            onError={() => setHeroVideoReady(true)}
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-english-950/75 via-black/35 to-transparent sm:from-english-950/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          <div
            className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" aria-hidden />
        </div>

        <AnimatePresence>
          {!heroVideoReady && (
            <motion.div
              key="hero-loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="absolute inset-0 z-[25] flex flex-col items-center justify-center gap-6 bg-neutral-950 px-6"
              aria-busy
              aria-label="Cargando"
            >
              <div className="relative h-28 w-full max-w-[300px] sm:h-36">
                <Image
                  src={HERO_LOGO_SRC}
                  alt="Bloom"
                  fill
                  className="object-contain object-center drop-shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                  sizes="300px"
                  priority
                />
              </div>
              <p className="text-bloom-cream font-bold tracking-[0.35em] text-[11px] sm:text-xs uppercase">Bloom</p>
              <div className="h-0.5 w-28 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-bloom-cream/70"
                  initial={{ x: "-120%" }}
                  animate={{ x: "320%" }}
                  transition={{ repeat: Infinity, duration: 1.15, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 h-full flex flex-col justify-end container mx-auto px-4 md:px-6 pb-10 sm:pb-12 md:pb-14 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={
              heroVideoReady
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 16 }
            }
            transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="w-full max-w-3xl text-white pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <h1 className="text-[1.85rem] sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-4 sm:mb-5 [text-shadow:0_4px_36px_rgba(0,0,0,0.55),0_2px_12px_rgba(0,0,0,0.45),0_1px_0_rgba(0,0,0,0.2)]">
              Mucho más
              <span className="text-bloom-cream [text-shadow:0_4px_28px_rgba(0,0,0,0.5),0_2px_10px_rgba(61,59,47,0.4)]"> que un café.</span>
            </h1>
            <p className="text-white/88 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-xl mb-6 sm:mb-8 [text-shadow:0_3px_20px_rgba(0,0,0,0.45),0_1px_4px_rgba(0,0,0,0.35)]">
              Especialidad, pastelería y cocina: todo en un solo lugar.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-600 px-6 sm:px-8 py-3 sm:py-3.5 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-[0_12px_40px_-8px_rgba(122,118,90,0.55),0_4px_14px_rgba(45,74,62,0.25)] hover:bg-bloom-700 hover:shadow-[0_16px_44px_-6px_rgba(95,92,70,0.5)] transition-all"
            >
              Ver menú
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section
        className="py-16 md:py-24 text-bloom-cream ring-1 ring-white/10"
        style={{ backgroundColor: "#2d4a3e" }}
      >
        <div className="container mx-auto px-4">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <h2 className="mb-3 text-3xl font-black tracking-tight text-bloom-cream drop-shadow-[0_4px_24px_rgba(0,0,0,0.25)] md:text-4xl lg:text-5xl">
              Sumate al Club Bloom
            </h2>
            <p className="text-base font-medium leading-relaxed text-bloom-cream/90 md:text-lg">
              Registrate una vez y sumá puntos con cada encargo
            </p>
          </FadeIn>
          <div className="mx-auto mb-10 grid max-w-5xl gap-4 sm:grid-cols-2 md:mb-12 md:grid-cols-3 md:gap-6">
            {[
              "☕ Cada 10 encargos el siguiente es gratis",
              "🎁 Regalos en tu cumpleaños",
              "🏷️ Descuentos exclusivos para socios",
            ].map((text, i) => (
              <FadeIn key={text} delay={i * 0.06}>
                <div className="flex h-full flex-col justify-center rounded-2xl border border-white/15 bg-white/[0.07] p-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-sm ring-1 ring-white/5 md:p-6">
                  <p className="text-center text-sm font-bold leading-snug text-bloom-cream md:text-base">
                    {text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="text-center">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-cream px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#2d4a3e] shadow-[0_12px_36px_-8px_rgba(0,0,0,0.4)] transition hover:bg-white hover:shadow-[0_16px_44px_-6px_rgba(0,0,0,0.45)]"
            >
              Quiero ser socio
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-bloom-page">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.25)]">
              Nuestra carta
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight drop-shadow-[0_2px_14px_rgba(61,59,47,0.12),0_1px_2px_rgba(61,59,47,0.08)]">
              Elegí por categoría
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 max-w-5xl mx-auto">
            {categoryCards.map((c, i) => {
              const Icon = c.Icon;
              return (
              <FadeIn key={c.title} delay={i * 0.05}>
                <Link
                  href={c.href}
                  className="group flex aspect-square flex-col rounded-2xl bg-bloom-600 p-4 sm:p-5 text-bloom-cream shadow-[0_14px_44px_-10px_rgba(95,92,70,0.42),0_6px_18px_rgba(45,74,62,0.18)] ring-1 ring-bloom-700/40 transition-all duration-300 hover:-translate-y-1.5 hover:bg-bloom-700 hover:shadow-[0_22px_52px_-8px_rgba(95,92,70,0.55),0_8px_24px_rgba(45,74,62,0.22)] hover:ring-bloom-500/45 outline-none focus-visible:ring-2 focus-visible:ring-bloom-cream focus-visible:ring-offset-2 focus-visible:ring-offset-bloom-page"
                >
                  <div className="flex min-h-0 flex-1 w-full items-center justify-center">
                    <Icon
                      className="h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem] text-white transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_4px_16px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.25)]"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                  </div>
                  <div className="shrink-0 pt-3 text-center border-t border-bloom-cream/15">
                    <h3 className="text-bloom-cream text-sm sm:text-base font-black leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
                      {c.title}
                    </h3>
                    <p className="text-bloom-cream/80 text-[11px] sm:text-xs font-medium mt-1 leading-snug drop-shadow-[0_1px_6px_rgba(0,0,0,0.2)]">
                      {c.hint}
                    </p>
                  </div>
                </Link>
              </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.2)]">
              Bloom
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 drop-shadow-[0_2px_14px_rgba(61,59,47,0.1),0_1px_2px_rgba(61,59,47,0.06)]">
              Favoritos de la casa
            </h2>
            <p className="text-neutral-600 mt-3 max-w-xl mx-auto drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              Precios y disponibilidad en el menú online.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {destacados.map((p, i) => (
              <FadeIn key={p.name + String(i)} delay={(i % 4) * 0.05}>
                <div className="group rounded-3xl border border-neutral-100/90 bg-bloom-page overflow-hidden shadow-[0_12px_40px_-10px_rgba(61,59,47,0.14),0_4px_14px_rgba(61,59,47,0.06)] hover:shadow-[0_24px_48px_-12px_rgba(61,59,47,0.2),0_8px_20px_rgba(61,59,47,0.08)] hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-square ring-1 ring-inset ring-black/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]">
                    <Image
                      src={p.img}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-neutral-900 text-lg leading-snug mb-2 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
                      {p.name}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-4 min-h-[2.5rem] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                      {p.desc}
                    </p>
                    <button
                      type="button"
                      disabled={favoriteProductIdByName[p.name] === undefined}
                      onClick={() => {
                        const id = favoriteProductIdByName[p.name];
                        if (id) {
                          void bloomChatRef.current?.openWithProductEncargado(id);
                        } else {
                          toast.error("No encontramos este producto ahora. Probá desde el menú.");
                        }
                      }}
                      className="block w-full text-center rounded-full border-2 border-bloom-600 text-bloom-600 font-bold py-2.5 hover:bg-bloom-600 hover:text-white transition-colors text-sm uppercase disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Encargar
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/menu" className="inline-flex items-center gap-2 font-black text-bloom-600 hover:underline uppercase text-sm tracking-wide">
              Ver menú completo
              <ArrowRight size={16} />
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
            ].map((f, i) => {
              const FeatureIcon = f.icon;
              return (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="text-center px-2">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bloom-gold/25 text-bloom-600 shadow-[0_8px_28px_-4px_rgba(196,184,150,0.55),0_2px_8px_rgba(196,184,150,0.25)] ring-1 ring-bloom-gold/35">
                    <FeatureIcon size={32} strokeWidth={2} className="drop-shadow-[0_2px_4px_rgba(122,118,90,0.2)]" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wide text-neutral-900 mb-2 drop-shadow-[0_1px_3px_rgba(61,59,47,0.08)]">
                    {f.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                    {f.body}
                  </p>
                </div>
              </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#1a1a1a] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <FadeIn className="lg:w-1/2 relative w-full max-w-lg mx-auto">
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-[0_28px_64px_-12px_rgba(0,0,0,0.55),0_12px_36px_-6px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                <Image
                  src={U.sobreBloom}
                  alt="Vasos Bloom Coffee & More y pastelería sobre mantel verde"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn className="lg:w-1/2">
              <p className="text-bloom-gold font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                Sobre Bloom
              </p>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight [text-shadow:0_4px_28px_rgba(0,0,0,0.35),0_2px_10px_rgba(0,0,0,0.25)]">
                Cafetería familiar,{" "}
                <span className="text-bloom-gold [text-shadow:0_4px_24px_rgba(0,0,0,0.4)]">hecha con el corazón</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-5">
                Bloom es una cafetería familiar creada por Bárbara y Agustín como un proyecto lleno de amor, desafío y vocación. Somos un
                espacio cálido y de encuentro, donde ofrecemos cafés clásicos, sabores tradicionales y comidas caseras, elaboradas con
                ingredientes de calidad y ese toque hogareño que te hace sentir como en casa.
              </p>
              <p className="text-neutral-400 text-lg leading-relaxed mb-10">
                Nuestros hijos forman parte de nuestro día a día, y esa esencia familiar se refleja en el ambiente, en el equipo y en la forma
                en que recibimos a cada cliente. En Bloom buscamos que todos se sientan bienvenidos, cómodos y felices de volver.
              </p>
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
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.2)]">
              Clientes
            </p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900 mb-10 drop-shadow-[0_2px_12px_rgba(61,59,47,0.1)]">
              La experiencia de quienes nos eligen
            </h2>
            <div className="rounded-3xl bg-white border border-bloom-200 shadow-[0_16px_48px_-10px_rgba(61,59,47,0.14),0_6px_20px_rgba(61,59,47,0.08)] p-8 md:p-12">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-6 h-6 text-bloom-gold fill-bloom-gold" />
                ))}
              </div>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed mb-8 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                &ldquo;Excelente café y las tortas son un viaje de ida. Volvemos siempre que podemos; el servicio es súper atento.&rdquo;
              </p>
              <p className="font-black text-neutral-900 text-lg drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                María · Mar del Plata
              </p>
              <p className="text-neutral-500 text-sm font-semibold">Cliente frecuente</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-bloom-page">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative w-full">
            <div className="relative w-full max-w-lg mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(61,59,47,0.28),0_8px_24px_rgba(61,59,47,0.12)] ring-1 ring-black/[0.06]">
              <Image src={U.delivery} alt="Delivery Bloom" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
          <FadeIn className="lg:w-1/2 text-center lg:text-left">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.2)]">
              Pedidos online
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6 drop-shadow-[0_2px_14px_rgba(61,59,47,0.1)]">
              Delivery en la ciudad
            </h2>
            <p className="text-neutral-600 text-lg mb-8 max-w-lg drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
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
            <Image
              src={HERO_LOGO_SRC}
              alt="Bloom Coffee & More"
              width={160}
              height={52}
              className="h-8 sm:h-9 w-auto max-w-[200px] object-contain opacity-95"
            />
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
          <Link
            href="/login"
            className="mx-auto mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors"
          >
            Staff
          </Link>
        </div>
      </footer>

      <BloomChat ref={bloomChatRef} />
    </main>
  );
}
