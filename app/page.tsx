import dynamic from 'next/dynamic';
import { Hero } from "@/components/Landing/Hero";

const AboutSection = dynamic(() => import("@/components/About/AboutSection").then(mod => mod.AboutSection));
const OfferSection = dynamic(() => import("@/components/Landing/OfferSection").then(mod => mod.OfferSection));
const SpacesSection = dynamic(() => import("@/components/Landing/SpacesSection").then(mod => mod.SpacesSection));
const ContactSection = dynamic(() => import("@/components/Contact/ContactSection").then(mod => mod.ContactSection));
const Footer = dynamic(() => import("@/components/Landing/Footer").then(mod => mod.Footer));
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <AboutSection />
      <OfferSection />
      <SpacesSection />
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
