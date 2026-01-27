

import Image from 'next/image';

const SPACES = [
    { title: 'Desayunos & Meriendas', description: 'Comenzá tu día con café y medialunas.', featured: true, image: '/images/alfajor.jpg' },
    { title: 'Almuerzos Caseros', description: 'Pastas, milanesas y platos del día.', featured: false, image: '/images/pasta.jpg' },
    { title: 'Cafetería Premium', description: 'Espresso y capuccinos de calidad.', featured: false, image: '/images/hero-new.jpg' },
    { title: 'Espacio Familiar', description: 'Un lugar donde todos son bienvenidos.', featured: false, image: '/images/wrap2.jpg' }
];

export function SpacesSection() {
    return (
        <section className="py-10 bg-[#F5E6D3]">
            <div className="max-w-6xl mx-auto px-8">
                <h2 className="text-6xl font-bold text-center mb-8 text-[#6B4E3D] font-serif">
                    Tu Lugar en Cada Momento
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {SPACES.map((space, i) => (
                        <article key={i} className="relative bg-white overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-lg rounded-2xl group">
                            <div className="relative h-96 w-full">
                                <Image
                                    src={space.image}
                                    alt={space.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />
                            </div>
                            <div className="p-12">
                                <h3 className="text-3xl font-bold text-[#C17154] font-serif mb-6">{space.title}</h3>
                                <p className="text-lg text-[#6B4E3D]">{space.description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
