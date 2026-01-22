'use client';

export function Footer() {
    return (
        <footer className="bg-[#6B4E3D] text-[#F5E6D3] py-16">
            <div className="max-w-6xl mx-auto px-8">
                {/* Contenido principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pb-12 border-b border-[#F5E6D3]/20 mb-8">
                    {/* Brand */}
                    <div>
                        <h3 className="text-4xl font-bold text-[#E8A387] font-serif mb-2">
                            BLOOM
                        </h3>
                        <p className="text-lg mb-4">Coffee & More</p>
                        <p className="text-base italic opacity-80">
                            Una cafetería familiar donde todos son bienvenidos
                        </p>
                    </div>

                    {/* Info */}
                    <div className="text-right">
                        <p className="text-base leading-relaxed mb-4">
                            [Dirección]<br />
                            Mar del Plata, Buenos Aires
                        </p>
                        <p className="text-[#E8A387] font-medium">
                            [Email/Teléfono]
                        </p>
                    </div>
                </div>

                {/* Copyright */}
                <div className="text-center text-sm opacity-70">
                    <p>© 2025 Bloom Coffee & More - Hecho con ❤️ por Bárbara y Agustín</p>
                </div>
            </div>
        </footer>
    );
}
