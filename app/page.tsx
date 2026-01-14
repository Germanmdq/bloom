import { Hero } from "@/components/landing/Hero";
import { MenuGrid } from "@/components/landing/MenuGrid";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas">
      <Hero />
      <MenuGrid />

      <div className="fixed bottom-8 right-8 z-50">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full hover:scale-105 transition-transform shadow-2xl font-medium"
        >
          Acceso Personal
        </Link>
      </div>
    </main>
  );
}
