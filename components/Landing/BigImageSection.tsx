

import Image from 'next/image';

export function BigImageSection() {
    return (
        <section className="relative w-full h-[70vh] overflow-hidden group">
            <Image
                src="/images/wrap2.jpg"
                alt="Ambiente Bloom"
                fill
                className="object-cover transition-transform duration-[2s] group-hover:scale-105"
                sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
            <div className="absolute bottom-16 left-16 bg-[#C17154]/90 backdrop-blur-md p-8 max-w-xl">
                <h3 className="text-4xl font-bold text-white font-serif">
                    Un lugar donde todos son bienvenidos
                </h3>
            </div>
        </section>
    );
}
