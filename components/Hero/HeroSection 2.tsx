import Link from 'next/link';
import Image from 'next/image';
import './HeroSection.css';

export function HeroSection() {
    return (
        <section className="hero-section">
            {/* Top Navigation */}
            <nav className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6">
                <div className="font-serif text-[#F5E6D3] text-xl font-bold tracking-widest">BLOOM</div>
                <div className="flex gap-8">
                    <Link href="/menu" className="text-[#F5E6D3] font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors">
                        Menú
                    </Link>
                    <Link href="/menu" className="text-[#F5E6D3] font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors">
                        Delivery
                    </Link>
                    <a href="#about" className="text-[#F5E6D3] font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors">
                        Quiénes Somos
                    </a>
                    <a href="#contact" className="text-[#F5E6D3] font-bold uppercase tracking-widest text-sm hover:text-[#D4AF37] transition-colors">
                        Contacto
                    </a>
                </div>
            </nav>

            <div className="hero-container">
                {/* Columna B: Café con latte art */}
                <div className="hero-column">
                    <div className="hero-letter">B</div>
                    <Image
                        src="/images/hero/hero-latte-art.png"
                        alt="Café con arte"
                        fill
                        className="hero-image"
                        sizes="(max-width: 768px) 100vw, 20vw"
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
                        sizes="(max-width: 768px) 100vw, 20vw"
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
                        sizes="(max-width: 768px) 100vw, 20vw"
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
                        sizes="(max-width: 768px) 100vw, 20vw"
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
                        sizes="(max-width: 768px) 100vw, 20vw"
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
