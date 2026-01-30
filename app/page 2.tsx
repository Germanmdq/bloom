'use client'

import { VideoHero } from "@/components/Landing/VideoHero"
import { AppleCarousel } from "@/components/Landing/AppleCarousel"
import { AboutSection } from "@/components/About/AboutSection"
import { OfferSection } from "@/components/Landing/OfferSection"

export default function Home() {
  return (
    <main className="min-h-screen">
      <VideoHero />
      <div id="menu">
        <AppleCarousel />
      </div>
      <AboutSection />
      <OfferSection />
    </main>
  )
}
