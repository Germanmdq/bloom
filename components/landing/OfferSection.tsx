'use client';

import './OfferSection.css';

export function OfferSection() {
    return (
        <section className="offer-section">
            <div className="container-wide">
                <div className="offer-grid">
                    <div className="offer-images">
                        <div className="image-box">
                            {/* Breakfast -> Latte Art */}
                            <img src="/images/hero/hero-latte-art.png" alt="Desayuno" />
                        </div>
                        <div className="image-box">
                            {/* Pasta -> Homemade food (Placeholder: Coffee beans) */}
                            <img src="/images/hero/hero-homemade-food.png" alt="Pasta casera" />
                        </div>
                        <div className="image-box">
                            {/* Pastry -> Pastries */}
                            <img src="/images/hero/hero-pastries.png" alt="Pastelería" />
                        </div>
                    </div>

                    <div className="offer-text">
                        <p className="intro">En Bloom,</p>
                        <h2>cada plato y cada café se preparan con el mismo amor que pondríamos en nuestra propia casa</h2>

                        <p className="description">
                            Desde un espresso perfectamente preparado hasta platos caseros que
                            te recuerdan a la comida de la abuela. Nuestro menú combina cafés
                            clásicos, desayunos completos, almuerzos reconfortantes y pastelería
                            artesanal.
                        </p>

                        <p className="description">
                            Todo está hecho con ingredientes de calidad, cocinado con dedicación
                            y servido con una sonrisa. Porque en Bloom, cada cliente es parte de
                            nuestra familia.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
