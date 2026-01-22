'use client';

const SPACES = [
    {
        title: 'Desayunos & Meriendas',
        description: 'Comenzá o terminá tu día con nuestros desayunos completos. Desde el clásico café con medialunas hasta el Desayuno Bloom con tostadas, huevo revuelto y palta.',
        featured: true
    },
    {
        title: 'Almuerzos Caseros',
        description: 'Pastas frescas, milanesas, pizzas, ensaladas y platos del día. Comida casera de verdad, como la que se hace en casa.',
        featured: false
    },
    {
        title: 'Cafetería Premium',
        description: 'Desde un espresso perfecto hasta capuccinos cremosos. Café de calidad preparado por manos expertas.',
        featured: false
    },
    {
        title: 'Espacio Familiar',
        description: 'Un lugar donde los niños son bienvenidos y las familias se sienten como en casa. WiFi, ambiente tranquilo y sonrisas.',
        featured: false
    }
];

export function SpacesSection() {
    return (
        <section className="py-20 bg-[#F5E6D3]">
            <div className="max-w-6xl mx-auto px-8">
                <h2 className="text-6xl font-bold text-center mb-16 text-[#6B4E3D] font-serif">
                    Tu Lugar en Cada Momento
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {SPACES.map((space, index) => (
                        <article
                            key={index}
                            className={`bg-white overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer ${space.featured ? 'lg:col-span-2 lg:grid lg:grid-cols-2' : ''
                                }`}
                        >
                            {/* Imagen placeholder */}
                            <div className="h-96 bg-gradient-to-br from-[#C17154] to-[#E8A387]" />

                            {/* Contenido */}
                            <div className="p-12">
                                <h3 className="text-3xl font-bold text-[#C17154] font-serif mb-6">
                                    {space.title}
                                </h3>
                                <p className="text-lg text-[#6B4E3D] leading-relaxed">
                                    {space.description}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
