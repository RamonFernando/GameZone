import Image from "next/image";

export function Footer() {
  return (
    <footer className="footer">
  <div className="footer-wrapper">
    
    {/* IZQUIERDA – INFO */}
    <div className="footer-info">
      <h3 className="footer-title">Next Gaming Store</h3>
      <p className="footer-text">
        Tu tienda digital de videojuegos y contenido gaming.
        UI creada para ofrecer la mejor experiencia en plataformas PlayStation, Xbox, Nintendo y PC.
      </p>
      <span className="footer-copy">© {new Date().getFullYear()} Next Gaming Store. Todos los derechos reservados.</span>
    </div>

    {/* DERECHA – REDES SOCIALES */}
    <div className="footer-social">
      <h4 className="footer-social-title">Síguenos</h4>

      <div className="footer-icons">
        {/* youtube */}
        <a href="#" aria-label="YouTube" className="footer-icon">
          <Image src="/iconos_platforms/youtube2.svg" alt="YouTube" width={28} height={28} className="footer-icon-img" unoptimized />
        </a>
        {/* Instagram */}
        <a href="#" aria-label="Instagram" className="footer-icon">
          <Image src="/iconos_platforms/instagram.svg" alt="Instagram" width={28} height={28} className="footer-icon-img" unoptimized />
        </a>

        {/* Twitter */}
        <a href="#" aria-label="Twitter" className="footer-icon">
          <Image src="/iconos_platforms/twiter.svg" alt="Twitter" width={28} height={28} className="footer-icon-img" />
        </a>

        {/* facebook */}
        <a href="#" aria-label="Facebook" className="footer-icon">
          <Image src="/iconos_platforms/facebook2.svg" alt="Facebook" width={28} height={28} className="footer-icon-img" />
        </a>
        
      </div>
    </div>

  </div>
</footer>

  );
}