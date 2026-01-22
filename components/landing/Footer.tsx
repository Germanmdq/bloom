import './Footer.css';

export function Footer() {
    return (
        <footer className="main-footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>BLOOM</h3>
                        <p>Coffee & More</p>
                        <p className="footer-tagline">
                            Una cafetería familiar donde todos son bienvenidos
                        </p>
                    </div>

                    <div className="footer-info">
                        <p>
                            Calle Falsa 123<br />
                            Mar del Plata, Buenos Aires
                        </p>
                        <p className="footer-contact">hola@cafebloom.com</p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2025 Bloom Coffee & More - Hecho con ❤️ por Bárbara y Agustín</p>
                </div>
            </div>
        </footer>
    );
}
