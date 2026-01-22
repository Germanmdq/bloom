'use client';

export function OfferSection() {
    return (
        <section className="py-20 bg-gradient-to-br from-[#C17154] to-[#E8A387] text-white">
            <div className="max-w-7xl mx-auto px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl overflow-hidden h-96 shadow-2xl hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-[#6B4E3D] to-[#8B9556]" />
                        <div className="rounded-xl overflow-hidden h-96 shadow-2xl hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-[#D4A574] to-[#C17154]" />
                        <div className="rounded-xl overflow-hidden h-96 shadow-2xl hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-[#E8A387] to-[#F5E6D3]" />
                    </div>
                    <div>
                        <p className="text-2xl italic opacity-90 mb-4">En Bloom,</p>
                        <h2 className="text-5xl font-bold mb-8 leading-tight font-serif">
                            cada plato y cada café se preparan con el mismo amor que pondríamos en nuestra propia casa
                        </h2>
                        <p className="text-xl mb-6 opacity-95 leading-relaxed">
                            Desde un espresso perfectamente preparado hasta platos caseros que te recuerdan a la comida de la abuela.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
