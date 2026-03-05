import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones | Next Gaming Store",
  description:
    "Términos y condiciones de uso de la plataforma Next Gaming Store. Aceptación, uso del servicio y derechos.",
};

export default function TermsPage() {
  return (
    <main className="main-wrapper">
      <article className="legal-page">
        <header className="legal-page-header">
          <h1 className="legal-page-title">Términos y condiciones</h1>
          <p className="legal-page-updated">
            Última actualización: marzo de 2025
          </p>
          <Link href="/" className="legal-page-back">
            ← Volver al inicio
          </Link>
        </header>

        <div className="legal-page-body">
          <section className="legal-section">
            <h2>1. Aceptación de los términos</h2>
            <p>
              El acceso y uso de la plataforma Next Gaming Store (&quot;la Plataforma&quot;, &quot;el Servicio&quot;) implica la aceptación plena de los presentes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios. El uso continuado de la Plataforma tras cualquier modificación constituye la aceptación de dichos cambios.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Descripción del servicio</h2>
            <p>
              Next Gaming Store es una tienda digital que ofrece productos de videojuegos y contenido gaming (claves, códigos digitales, suscripciones y contenido relacionado) para distintas plataformas (PlayStation, Xbox, Nintendo, PC). Los productos se entregan de forma digital según las condiciones de cada oferta.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Registro y cuenta</h2>
            <p>
              Para realizar compras o acceder a determinadas funciones puede ser necesario registrarse y crear una cuenta. Usted se compromete a proporcionar información veraz, actual y completa, y a mantener la confidencialidad de sus credenciales. Es responsable de toda la actividad que se realice en su cuenta.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Compras, precios y pagos</h2>
            <p>
              Los precios mostrados incluyen IVA cuando aplique y son los vigentes en el momento de la compra. Nos reservamos el derecho de modificar precios y ofertas. El pago se realiza mediante los métodos admitidos en la Plataforma (tarjeta, PayPal, etc.). Una vez confirmado el pago, se iniciará el proceso de entrega del producto digital según las condiciones del artículo.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Entrega y soporte</h2>
            <p>
              Los productos digitales se entregan según el método indicado en cada producto (clave, enlace, correo electrónico, etc.). El usuario es responsable de utilizar las claves o códigos en las plataformas correspondientes. Ante incidencias con una compra, el usuario puede contactar con nuestro soporte para resolver reclamaciones dentro de los plazos legalmente establecidos.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Devoluciones y reembolsos</h2>
            <p>
              Por la naturaleza de los productos digitales, las devoluciones pueden estar limitadas según la legislación aplicable. Se atenderán reclamaciones por productos no entregados, no válidos o no conformes según nuestra política de reembolsos y la normativa de defensa de consumidores.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Uso aceptable</h2>
            <p>
              El usuario se compromete a utilizar la Plataforma de forma lícita y conforme a estos términos. Queda prohibido el uso fraudulento, la reventa no autorizada de claves, la manipulación de precios o sistemas, y cualquier conducta que perjudique a la Plataforma o a terceros. Nos reservamos el derecho de suspender o cerrar cuentas que infrinjan estas normas.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Propiedad intelectual</h2>
            <p>
              La Plataforma, su diseño, logotipos, marcas y contenidos propios están protegidos por derechos de propiedad intelectual. Los videojuegos y contenidos digitales son propiedad de sus respectivos titulares. La compra de un producto digital otorga únicamente los derechos de uso que establezca el proveedor o editor correspondiente.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Limitación de responsabilidad</h2>
            <p>
              La Plataforma se ofrece &quot;tal cual&quot;. No nos hacemos responsables de daños indirectos, pérdida de datos o beneficios, ni de problemas derivados del uso de productos de terceros (plataformas, editores). Nuestra responsabilidad se limita, en la medida permitida por la ley, al importe abonado por el producto o servicio objeto de la reclamación.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Modificaciones</h2>
            <p>
              Podemos modificar estos Términos y Condiciones en cualquier momento. Los cambios serán efectivos desde su publicación en la Plataforma. Le recomendamos revisar esta página periódicamente. El uso continuado del Servicio tras la entrada en vigor de las modificaciones implica su aceptación.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del consumidor o a los que legalmente correspondan según la normativa de protección de consumidores.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Contacto</h2>
            <p>
              Para cuestiones relacionadas con estos Términos y Condiciones puede contactarnos a través de los canales de soporte indicados en la Plataforma (formulario de contacto, correo electrónico o dirección de atención al cliente).
            </p>
          </section>
        </div>

        <footer className="legal-page-footer">
          <Link href="/privacy" className="legal-page-link">
            Política de privacidad
          </Link>
          <Link href="/" className="legal-page-link">
            Inicio
          </Link>
        </footer>
      </article>
    </main>
  );
}
