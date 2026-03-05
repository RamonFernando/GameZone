import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Next Gaming Store",
  description:
    "Política de privacidad de Next Gaming Store. Cómo recogemos, usamos y protegemos tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <main className="main-wrapper">
      <article className="legal-page">
        <header className="legal-page-header">
          <h1 className="legal-page-title">Política de privacidad</h1>
          <p className="legal-page-updated">
            Última actualización: marzo de 2025
          </p>
          <Link href="/" className="legal-page-back">
            ← Volver al inicio
          </Link>
        </header>

        <div className="legal-page-body">
          <section className="legal-section">
            <h2>1. Responsable del tratamiento</h2>
            <p>
              Next Gaming Store es el responsable del tratamiento de los datos personales que nos facilite a través de la plataforma (sitio web y servicios asociados). Puede contactarnos para ejercer sus derechos o formular consultas a través de los canales de atención indicados en la web.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Datos que recogemos</h2>
            <p>
              Podemos recoger y tratar, según el uso que haga del Servicio: datos de identificación (nombre, apellidos, correo electrónico); datos de facturación y pago necesarios para procesar las compras; datos de uso (dirección IP, tipo de dispositivo, páginas visitadas, preferencias de idioma y moneda); y, si nos los facilita, datos de perfil (avatar, preferencias de comunicación). Los datos de pago sensibles (tarjeta completa, etc.) son gestionados por los proveedores de pago y no se almacenan en nuestros servidores.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Finalidad y base legal</h2>
            <p>
              Utilizamos sus datos para: gestionar su cuenta y las compras; procesar pagos y entregar productos digitales; enviar comunicaciones transaccionales (confirmación de pedido, claves, facturas); mejorar nuestros servicios y la experiencia de usuario; cumplir obligaciones legales; y, si ha dado su consentimiento, enviar ofertas y novedades. La base legal es la ejecución del contrato (compra, cuenta), el consentimiento (newsletters, cookies no esenciales) y el interés legítimo (seguridad, mejora del servicio, analíticas básicas).
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Conservación</h2>
            <p>
              Conservamos sus datos mientras mantenga una cuenta activa o sea necesario para la relación contractual, la facturación y las obligaciones legales (por ejemplo, datos fiscales según la normativa aplicable). Los datos de navegación y analíticas se conservan según los plazos definidos en nuestra configuración de cookies. Puede solicitar la supresión de su cuenta y datos en cualquier momento, salvo los que debamos retener por obligación legal.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Destinatarios y transferencias</h2>
            <p>
              Sus datos pueden ser compartidos con: proveedores de pago (para procesar transacciones); proveedores de hosting y servicios técnicos que actúan como encargados del tratamiento; y autoridades cuando sea obligatorio por ley. No realizamos transferencias internacionales fuera del Espacio Económico Europeo salvo que se garanticen las garantías adecuadas (cláusulas tipo, decisiones de adecuación, etc.).
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Cookies y tecnologías similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para el funcionamiento básico del sitio (sesión, preferencias de idioma/moneda), analíticas de uso y, en su caso, publicidad o personalización. Puede configurar sus preferencias en el aviso de cookies o desde la configuración de su navegador. La desactivación de cookies esenciales puede afectar al correcto uso de la Plataforma.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos frente a accesos no autorizados, pérdida o alteración (cifrado, control de acceso, revisiones periódicas). Le pedimos que mantenga la confidencialidad de sus credenciales y que nos comunique cualquier incidente que pueda afectar a su cuenta.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Sus derechos</h2>
            <p>
              Puede ejercer en cualquier momento sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición, así como retirar su consentimiento cuando el tratamiento se base en él. Para ello puede contactarnos por los medios indicados en la Plataforma. También tiene derecho a presentar una reclamación ante la autoridad de control competente (en España, la Agencia Española de Protección de Datos — AEPD).
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Menores</h2>
            <p>
              Nuestros servicios están dirigidos a usuarios con edad legal para contratar según su jurisdicción. No recogemos intencionadamente datos de menores sin el consentimiento de padres o tutores. Si tiene conocimiento de que un menor nos ha facilitado datos sin autorización, puede contactarnos para proceder a su supresión.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta Política de privacidad para reflejar cambios en nuestras prácticas o en la normativa. Los cambios significativos se comunicarán mediante un aviso en la Plataforma o por correo electrónico cuando así lo exija la ley. La fecha de &quot;Última actualización&quot; indica la versión vigente. Le recomendamos revisar esta página periódicamente.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad o para ejercer sus derechos, puede dirigirse a nosotros a través del formulario de contacto, la dirección de correo electrónico de soporte o la dirección postal publicada en la Plataforma.
            </p>
          </section>
        </div>

        <footer className="legal-page-footer">
          <Link href="/terms" className="legal-page-link">
            Términos y condiciones
          </Link>
          <Link href="/" className="legal-page-link">
            Inicio
          </Link>
        </footer>
      </article>
    </main>
  );
}
