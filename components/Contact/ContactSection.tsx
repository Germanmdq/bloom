'use client';

import './ContactSection.css';

export function ContactSection() {
    return (
        <section className="contact-section">
            <div className="container">
                <h2>Visitanos</h2>
                <p className="contact-intro">
                    Estamos en Mar del Plata esperándote con café caliente y una sonrisa
                </p>

                <div className="contact-info">
                    <div className="info-item">
                        <h3>📍 Ubicación</h3>
                        <p>
                            Calle Falsa 123<br />
                            Mar del Plata, Buenos Aires<br />
                            Argentina
                        </p>
                    </div>

                    <div className="info-item">
                        <h3>⏰ Horarios</h3>
                        <p>
                            Lunes a Sábado<br />
                            08:00 - 20:00 hs<br />
                            Domingos CERRADO
                        </p>
                    </div>

                    <div className="info-item">
                        <h3>📞 Contacto</h3>
                        <p>
                            +54 223 123 4567<br />
                            hola@cafebloom.com
                        </p>
                    </div>
                </div>

                <div className="social-links">
                    <a href="#" className="social-btn">Instagram</a>
                    <a href="#" className="social-btn">WhatsApp</a>
                </div>
            </div>
        </section>
    );
}
