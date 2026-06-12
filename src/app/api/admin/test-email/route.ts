import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "";

  if (!host || !user || !pass) {
    return NextResponse.json({
      ok: false,
      error: "Variables SMTP no configuradas",
      vars: { host: !!host, user: !!user, pass: !!pass },
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"GameZone Test" <${from}>`,
      to: user,
      subject: "GameZone — test de email OK",
      text: "Si recibes este email, el SMTP está funcionando correctamente.",
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: (error as { code?: string }).code,
    });
  }
}
