'use client';

import './AboutSection.css';

export function AboutSection() {
    return (
        <section className="about-section">
            <div className="container">
                <h1 className="brand-name">BLOOM</h1>
                <p className="tagline">Coffee & More</p>
                <h2 className="location">
                    Mar del Plata, <span className="accent">Argentina</span>
                </h2>

                <div className="story">
                    <p className="lead">
                        Bloom es una cafetería familiar creada por Bárbara y Agustín como
                        un proyecto lleno de amor, desafío y vocación.
                    </p>

                    <p>
                        Somos un espacio cálido y de encuentro, donde ofrecemos cafés clásicos,
                        sabores tradicionales y comidas caseras, elaboradas con ingredientes de
                        calidad y ese toque hogareño que te hace sentir como en casa.
                    </p>

                    <p>
                        Nuestros hijos forman parte de nuestro día a día, y esa esencia familiar
                        se refleja en el ambiente, en el equipo y en la forma en que recibimos a
                        cada cliente. En Bloom buscamos que todos se sientan bienvenidos, cómodos
                        y felices de volver.
                    </p>

                    <p className="opening">
                        ✨ Abierto desde el 13 de Enero de 2025
                    </p>
                </div>
            </div>
        </section>
    );
}
