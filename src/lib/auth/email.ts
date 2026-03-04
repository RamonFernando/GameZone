import nodemailer from "nodemailer";

type MailerConfig = {
  transporter: nodemailer.Transporter;
  from: string;
  isTestTransport: boolean;
};

let cachedMailerConfig: Promise<MailerConfig> | null = null;

async function createMailerConfig(): Promise<MailerConfig> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  const hasPlaceholderCredentials =
    Boolean(user?.includes("tu_correo")) || Boolean(pass?.includes("tu_app_password"));

  if (host && user && pass && !hasPlaceholderCredentials) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return {
      transporter,
      from: smtpFrom ?? user,
      isTestTransport: false,
    };
  }

  if (host && user && pass && hasPlaceholderCredentials) {
    console.warn(
      "SMTP configurado con valores de ejemplo. Usando transporte de prueba Ethereal."
    );
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return {
    transporter,
    from: testAccount.user,
    isTestTransport: true,
  };
}

async function getMailerConfig() {
  if (!cachedMailerConfig) {
    cachedMailerConfig = createMailerConfig();
  }
  return cachedMailerConfig;
}

export async function sendVerificationEmail(input: {
  to: string;
  username: string;
  verificationUrl: string;
}) {
  const { transporter, from, isTestTransport } = await getMailerConfig();

  const info = await transporter.sendMail({
    from: `"GameZone Access" <${from}>`,
    to: input.to,
    subject: "Verifica tu cuenta - GameZone Access",
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>Hola ${input.username},</h2>
        <p>Gracias por registrarte en GameZone Access.</p>
        <p>Para activar tu cuenta, verifica tu email desde el siguiente enlace:</p>
        <p>
          <a href="${input.verificationUrl}" target="_blank" rel="noopener noreferrer">
            Verificar cuenta
          </a>
        </p>
        <p>Este enlace expira en 24 horas.</p>
      </div>
    `,
    text: `Hola ${input.username}, verifica tu cuenta aquí: ${input.verificationUrl}`,
  });

  if (isTestTransport) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Vista previa email de verificación: ${previewUrl}`);
    }
  }
}

export async function sendPurchaseConfirmationEmail(input: {
  to: string;
  username: string;
  orderId: string;
  orderUrl: string;
  currency: string;
  totalAmount: number;
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}) {
  const { transporter, from, isTestTransport } = await getMailerConfig();
  const brandName = process.env.MAIL_BRAND_NAME ?? "GameZone Store";
  const supportEmail = process.env.MAIL_SUPPORT_EMAIL ?? "support@gamezone.local";
  const logoUrl = process.env.MAIL_LOGO_URL ?? "";

  const rowsHtml = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${item.unitPrice.toLocaleString("es-ES", { style: "currency", currency: input.currency })}
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${item.subtotal.toLocaleString("es-ES", { style: "currency", currency: input.currency })}
          </td>
        </tr>
      `
    )
    .join("");

  const info = await transporter.sendMail({
    from: `"${brandName}" <${from}>`,
    to: input.to,
    subject: `Confirmación de compra #${input.orderId.slice(0, 8)} - ${brandName}`,
    html: `
      <div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
          <div style="padding:18px 20px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="${brandName}" style="height:28px;width:auto;display:block;margin-bottom:8px;" />`
                : ""
            }
            <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">${brandName}</p>
            <h2 style="margin:6px 0 0 0;font-size:22px;">Compra confirmada</h2>
          </div>

          <div style="padding:18px 20px;">
            <p style="margin:0 0 8px 0;">Hola <strong>${input.username}</strong>,</p>
            <p style="margin:0 0 12px 0;">
              Tu pedido <strong>#${input.orderId.slice(0, 8)}</strong> fue confirmado correctamente.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px 6px; text-align: left; font-size:12px;">Juego</th>
                  <th style="padding: 8px 6px; text-align: center; font-size:12px;">Cantidad</th>
                  <th style="padding: 8px 6px; text-align: right; font-size:12px;">Precio</th>
                  <th style="padding: 8px 6px; text-align: right; font-size:12px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:right;">
              <span style="font-size:14px;color:#334155;">Total pagado: </span>
              <strong style="font-size:16px;">
                ${input.totalAmount.toLocaleString("es-ES", { style: "currency", currency: input.currency })}
              </strong>
            </div>

            <div style="margin-top:16px;padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;letter-spacing:.08em;text-transform:uppercase;">
                Datos del pedido
              </p>
              <p style="margin:0;font-size:14px;">
                <strong>Número:</strong> #${input.orderId.slice(0, 8)}<br />
                <strong>Email de entrega:</strong> ${input.to}
              </p>
            </div>

            <div style="margin-top:18px;text-align:center;">
              <a
                href="${input.orderUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="display:inline-block;padding:10px 16px;border-radius:999px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;"
              >
                Ver pedido en mi cuenta
              </a>
            </div>

            <p style="margin:18px 0 0 0;font-size:12px;color:#64748b;text-align:center;">
              Si tienes alguna duda, escríbenos a
              <a href="mailto:${supportEmail}" style="color:#4f46e5;text-decoration:none;"> ${supportEmail}</a>.
            </p>
          </div>
        </div>
      </div>
    `,
    text: [
      `Gracias por tu compra, ${input.username}.`,
      `Pedido #${input.orderId.slice(0, 8)} confirmado.`,
      `Ver pedido: ${input.orderUrl}`,
      ...input.items.map(
        (item) =>
          `- ${item.title} x${item.quantity} (${item.subtotal.toLocaleString("es-ES", {
            style: "currency",
            currency: input.currency,
          })})`
      ),
      `Total: ${input.totalAmount.toLocaleString("es-ES", {
        style: "currency",
        currency: input.currency,
      })}`,
    ].join("\n"),
  });

  if (isTestTransport) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Vista previa email de compra: ${previewUrl}`);
    }
  }
}

export async function sendRefundConfirmationEmail(input: {
  to: string;
  username: string;
  orderId: string;
  orderUrl: string;
  currency: string;
  totalAmount: number;
  reason: string;
}) {
  const { transporter, from, isTestTransport } = await getMailerConfig();
  const brandName = process.env.MAIL_BRAND_NAME ?? "GameZone Store";
  const supportEmail = process.env.MAIL_SUPPORT_EMAIL ?? "support@gamezone.local";

  const info = await transporter.sendMail({
    from: `"${brandName}" <${from}>`,
    to: input.to,
    subject: `Reembolso procesado #${input.orderId.slice(0, 8)} - ${brandName}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <h2>Hola ${input.username},</h2>
        <p>Hemos procesado el reembolso de tu pedido <strong>#${input.orderId.slice(0, 8)}</strong>.</p>
        <p>
          <strong>Importe reembolsado:</strong>
          ${input.totalAmount.toLocaleString("es-ES", { style: "currency", currency: input.currency })}
        </p>
        <p><strong>Motivo:</strong> ${input.reason}</p>
        <p>
          Puedes revisar el estado del pedido en:
          <a href="${input.orderUrl}" target="_blank" rel="noopener noreferrer"> tu cuenta</a>.
        </p>
        <p>Si necesitas ayuda, escríbenos a <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
      </div>
    `,
    text: [
      `Hola ${input.username},`,
      `Tu pedido #${input.orderId.slice(0, 8)} ha sido reembolsado.`,
      `Importe: ${input.totalAmount.toLocaleString("es-ES", { style: "currency", currency: input.currency })}`,
      `Motivo: ${input.reason}`,
      `Ver pedido: ${input.orderUrl}`,
      `Soporte: ${supportEmail}`,
    ].join("\n"),
  });

  if (isTestTransport) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Vista previa email de reembolso: ${previewUrl}`);
    }
  }
}
