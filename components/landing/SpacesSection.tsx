'use client';

import './SpacesSection.css';

export function SpacesSection() {
    return (
        <section className="spaces-section">
            <div className="container">
                <h2 className="section-title">Tu Lugar en Cada Momento</h2>

                <div className="spaces-grid">
                    {/* Card destacada: Desayunos */}
                    <article className="space-card featured">
                        <div className="card-image">
                            <img src="/images/hero/hero-latte-art.png" alt="Desayunos" />
                        </div>
                        <div className="card-content">
                            <h3>Desayunos & Meriendas</h3>
                            <p>
                                Comenzá o terminá tu día con nuestros desayunos completos.
                                Desde el clásico café con medialunas hasta el Desayuno Bloom
                                con tostadas, huevo revuelto y palta. Todo preparado al momento.
                            </p>
                        </div>
                    </article>

                    {/* Card: Almuerzos */}
                    <article className="space-card">
                        <div className="card-image">
                            <img src="/images/hero/hero-homemade-food.png" alt="Almuerzos" />
                        </div>
                        <div className="card-content">
                            <h3>Almuerzos Caseros</h3>
                            <p>
                                Pastas frescas, milanesas, pizzas, ensaladas y platos del día.
                                Comida casera de verdad, como la que se hace en casa.
                            </p>
                        </div>
                    </article>

                    {/* Card: Cafetería */}
                    <article className="space-card">
                        <div className="card-image">
                            <img src="/images/hero/hero-pastries.png" alt="Cafetería" />
                        </div>
                        <div className="card-content">
                            <h3>Cafetería Premium</h3>
                            <p>
                                Desde un espresso perfecto hasta capuccinos cremosos.
                                Café de calidad preparado por manos expertas.
                            </p>
                        </div>
                    </article>

                    {/* Card: Espacio Familiar */}
                    <article className="space-card">
                        <div className="card-image">
                            <img src="/images/hero/hero-family.png" alt="Espacio familiar" />
                        </div>
                        <div className="card-content">
                            <h3>Espacio Familiar</h3>
                            <p>
                                Un lugar donde los niños son bienvenidos y las familias
                                se sienten como en casa. WiFi, ambiente tranquilo y sonrisas.
                            </p>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
