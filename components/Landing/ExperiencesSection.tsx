"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function ExperiencesSection() {
    const experiences = [
        {
            title: "Catas de Café",
            description: "Explora el mundo del café a través de nuestras catas guiadas. Aprende a distinguir los perfiles de sabor de diferentes orígenes y métodos de preparación.",
            image: "/images/experience/coffee-tasting.png",
            featured: true
        },
        {
            title: "Cursos de Barismo",
            description: "Talleres prácticos donde aprenderás las técnicas profesionales para preparar el café perfecto.",
            image: "/images/experience/barista-training.png",
            featured: false
        },
        {
            title: "Espacio de Trabajo",
            description: "Ambiente ideal para trabajar o estudiar, con WiFi de alta velocidad y café ilimitado.",
            image: "/images/experience/workspace.png",
            featured: false
        },
        {
            title: "Eventos Privados",
            description: "Reserva nuestro espacio para eventos corporativos, celebraciones o reuniones especiales.",
            image: "/images/experience/private-events.png",
            featured: false
        }
    ];

    return (
        <section className="bg-[#EFEBE9] py-32" id="experiencias">
            <div className="container mx-auto px-8 max-w-[1200px]">
                <h2 className="text-[4rem] text-center mb-20 font-display text-[#3E2723] tracking-widest">
                    La Experiencia <span className="font-poppins">Bloom</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {experiences.map((exp, index) => (
                        <article
                            key={index}
                            className={`experience-card group bg-white overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-400 ${exp.featured ? 'md:col-span-2 md:grid md:grid-cols-[1.2fr_1fr]' : ''}`}
                        >
                            <div className={`relative overflow-hidden ${exp.featured ? 'h-[400px] md:h-full' : 'h-[400px]'}`}>
                                <Image
                                    src={exp.image}
                                    alt={exp.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110 brightness-90"
                                />
                            </div>

                            <div className="p-12 flex flex-col justify-center gap-6">
                                <h3 className="text-[2.2rem] font-bold text-[#3E2723] font-display">{exp.title}</h3>
                                <p className="text-[1.15rem] leading-[1.7] text-[#6D4C41]">
                                    {exp.description}
                                </p>
                                <a href="#contacto" className="inline-flex items-center gap-2 text-[#D4AF37] font-bold group-hover:gap-4 transition-all">
                                    Más información <span>→</span>
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
