
import Link from "next/link";
export function Footer() {
    return (
        <footer className="bg-[#6B4E3D] text-[#F5E6D3] py-16">
            <div className="max-w-6xl mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pb-12 border-b border-[#F5E6D3]/20 mb-8">
                    <div>
                        <h3 className="text-4xl font-bold text-[#E8A387] font-serif mb-2">BLOOM</h3>
                        <p className="text-lg mb-4">Coffee & More</p>
                        <p className="text-base italic opacity-80">Una cafetería familiar</p>
                    </div>
                    <div className="text-right">
                        <p className="text-base leading-relaxed mb-4">Mar del Plata, Buenos Aires</p>
                    </div>
                </div>
                <div className="text-center text-sm opacity-70 mt-8 pt-8 border-t border-[#F5E6D3]/10">
                    <p>© 2025 Bloom - Hecho con ❤️ por Bárbara y Agustín</p>
                </div>
            </div>
        </footer>
    );
}
