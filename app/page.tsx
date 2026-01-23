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

      {/* Staff Access - Static at bottom */}
      <div className="bg-[#6B4E3D] py-4 text-center">
        <Link
          href="/dashboard"
          className="text-[#F5E6D3]/30 text-[10px] hover:text-[#F5E6D3] uppercase tracking-widest transition-colors font-sans"
        >
          Staff
        </Link>
      </div>


    </main>
  );
}
