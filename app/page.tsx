import { HeroSection } from "@/components/Hero/HeroSection";
import { AboutSection } from "@/components/About/AboutSection";
import { OfferSection } from "@/components/Landing/OfferSection";
import { SpacesSection } from "@/components/Landing/SpacesSection";
import { BigImageSection } from "@/components/Landing/BigImageSection";
import { ContactSection } from "@/components/Contact/ContactSection";
import { Footer } from "@/components/Landing/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <AboutSection />
      <OfferSection />
      <SpacesSection />
      <BigImageSection />
      <ContactSection />
      <Footer />

      <div className="fixed bottom-8 right-8 z-50">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-[#D4AF37] text-[#3E2723] px-6 py-3 rounded-full hover:scale-105 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.4)] font-bold uppercase tracking-widest border-2 border-[#3E2723]"
        >
          Acceso Personal
        </Link>
      </div>
    </main>
  );
}
