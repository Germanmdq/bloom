'use client';

import './BigImageSection.css';

export function BigImageSection() {
    return (
        <section className="hero-image-section">
            <img src="/images/bloom-interior-wide.png" alt="Interior de Bloom" />
            <div className="image-caption">
                <h3>Un lugar donde todos son bienvenidos</h3>
            </div>
        </section>
    );
}
