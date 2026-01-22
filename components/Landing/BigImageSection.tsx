'use client';

export function BigImageSection() {
    return (
        <section className="relative w-full h-[70vh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6B4E3D] to-[#C17154]" />
            <div className="absolute bottom-16 left-16 bg-[#C17154]/90 backdrop-blur-md p-8 max-w-xl">
                <h3 className="text-4xl font-bold text-white font-serif">
                    Un lugar donde todos son bienvenidos
                </h3>
            </div>
        </section>
    );
}
