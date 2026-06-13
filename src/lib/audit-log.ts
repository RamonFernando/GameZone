import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "REGISTER"
  | "EMAIL_VERIFIED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "2FA_CODE_VERIFY_SUCCESS"
  | "TOTP_VERIFY_SUCCESS"
  | "OAUTH_LOGIN"
  | "2FA_EMAIL_ENABLED"
  | "2FA_EMAIL_DISABLED"
  | "TOTP_ENABLED"
  | "TOTP_DISABLED"
  | "ADMIN_PRODUCT_CREATED"
  | "ADMIN_PRODUCT_UPDATED"
  | "ADMIN_PRODUCT_DELETED"
  | "ADMIN_USER_ROLE_CHANGED"
  | "ORDER_PAID";

export async function logAudit({
  userId,
  action,
  request,
  meta,
}: {
  userId?: string | null;
  action: AuditAction;
  request?: Request;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        ip: request
          ? (request.headers.get("x-forwarded-for") ??
             request.headers.get("x-real-ip") ??
             null)
          : null,
        userAgent: request ? (request.headers.get("user-agent") ?? null) : null,
        meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Audit failure must never interrupt the main flow
  }
}
