'use client';

import Image from 'next/image';
import './HeroSection.css';

export function HeroSection() {
    return (
        <section className="hero-section">
            <div className="hero-container">
                {/* Columna B: Café con latte art */}
                <div className="hero-column">
                    <div className="hero-letter">B</div>
                    <Image
                        src="/images/hero/hero-latte-art.png"
                        alt="Café con arte"
                        fill
                        className="hero-image"
                        priority
                    />
                </div>

                {/* Columna L: Medialunas/facturas */}
                <div className="hero-column">
                    <div className="hero-letter">L</div>
                    <Image
                        src="/images/hero/hero-pastries.png"
                        alt="Medialunas"
                        fill
                        className="hero-image"
                        priority
                    />
                </div>

                {/* Columna O: Plato de comida casera */}
                <div className="hero-column">
                    <div className="hero-letter">O</div>
                    <Image
                        src="/images/hero/hero-homemade-food.png"
                        alt="Comida casera"
                        fill
                        className="hero-image"
                        priority
                    />
                </div>

                {/* Columna O: Ambiente familiar (niños/familia) */}
                <div className="hero-column">
                    <div className="hero-letter">O</div>
                    <Image
                        src="/images/hero/hero-family.png"
                        alt="Ambiente familiar"
                        fill
                        className="hero-image"
                        priority
                    />
                </div>

                {/* Columna M: Interior acogedor */}
                <div className="hero-column">
                    <div className="hero-letter">M</div>
                    <Image
                        src="/images/hero/hero-interior.png"
                        alt="Nuestro espacio"
                        fill
                        className="hero-image"
                        priority
                    />
                </div>
            </div>

            <div className="location-badge">
                📍 Mar del Plata, Argentina
            </div>

            <div className="scroll-indicator">
                <span>DESCUBRE BLOOM</span>
                <div className="scroll-arrow"></div>
            </div>
        </section>
    );
}
