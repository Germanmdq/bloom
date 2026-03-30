"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { FoodKingMobileNavButton } from "@/components/FoodKingMobileNav";
import { PublicAccountNav } from "@/components/PublicAccountNav";

const HERO_LOGO_SRC = "/images/bloom-logo.png";

export type SiteHeaderProps = {
  /** Home: sombra al hacer scroll. Menú: suele ser false. */
  scrolled?: boolean;
  onMobileNavOpen: () => void;
  /** Resalta el ítem activo en la nav desktop */
  activeNav?: "home" | "menu";
  /** Colores marca (menú / QR) */
  accentColor?: string;
  /** Si se pasa, reemplaza el bloque "Pedir ahora" + "Equipo" (p. ej. categorías, mesa, carrito) */
  menuExtras?: ReactNode;
};

/**
 * Navbar sticky compartido (home + menú): logo, enlaces xl, móvil, cuenta.
 * En home: Pedir ahora + Equipo. En menú: pasar `menuExtras` (categorías, carrito, etc.).
 */
export function SiteHeader({
  scrolled = false,
  onMobileNavOpen,
  activeNav = "home",
  accentColor = "#7a765a",
  menuExtras,
}: SiteHeaderProps) {
  const isHome = activeNav === "home";

  return (
    <header
      className={`sticky top-0 z-50 transition-shadow duration-300 border-b border-english-100/80 ${
        scrolled ? "bg-white shadow-md" : "bg-white/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between gap-2 sm:gap-4 py-3 md:py-4">
        <Link href="/" className="flex items-center shrink-0 min-w-0">
          <Image
            src={HERO_LOGO_SRC}
            alt="Bloom Coffee & More"
            width={168}
            height={56}
            className="h-9 sm:h-10 w-auto max-w-[min(168px,42vw)] object-contain object-left"
            priority
          />
        </Link>
        <nav className="hidden xl:flex items-center gap-8 text-[15px] font-bold text-neutral-700">
          <Link
            href="/"
            className={isHome ? "text-bloom-600" : "hover:opacity-80 transition-opacity"}
            style={!isHome ? { color: accentColor } : undefined}
          >
            Inicio
          </Link>
          {activeNav === "menu" ? (
            <span className="font-bold text-bloom-600" style={{ color: accentColor }}>
              Menú
            </span>
          ) : (
            <Link href="/menu" className="hover:text-bloom-600 transition-colors">
              Menú
            </Link>
          )}
          <Link href="/about" className="hover:text-bloom-600 transition-colors">
            Nosotros
          </Link>
          <Link href="/reservations" className="hover:text-bloom-600 transition-colors">
            Reservas
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <FoodKingMobileNavButton onOpen={onMobileNavOpen} />
          {menuExtras ?? (
            <>
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-bloom-600 px-3 py-2 sm:px-5 sm:py-2.5 text-[11px] sm:text-sm font-bold text-white shadow hover:bg-bloom-700 transition-colors whitespace-nowrap"
              >
                <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                Pedir ahora
              </Link>
              <PublicAccountNav />
              <Link
                href="/login"
                className="hidden sm:inline text-[11px] font-bold text-neutral-400 hover:text-neutral-700 whitespace-nowrap"
              >
                Equipo
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
