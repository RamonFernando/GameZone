import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: mockCreate,
    },
  },
}));

import { logAudit } from "./audit-log";

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
  });

  it("crea el registro con los campos correctos", async () => {
    await logAudit({ userId: "user-1", action: "LOGIN_SUCCESS" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "LOGIN_SUCCESS",
        ip: null,
        userAgent: null,
        meta: undefined,
      },
    });
  });

  it("extrae IP de x-forwarded-for y userAgent del header user-agent", async () => {
    const request = new Request("https://test.com", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "Mozilla/5.0",
      },
    });
    await logAudit({ userId: "user-1", action: "LOGIN_SUCCESS", request });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: "1.2.3.4", userAgent: "Mozilla/5.0" }),
    });
  });

  it("usa x-real-ip como fallback si no hay x-forwarded-for", async () => {
    const request = new Request("https://test.com", {
      headers: { "x-real-ip": "5.6.7.8" },
    });
    await logAudit({ userId: "user-1", action: "LOGIN_SUCCESS", request });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: "5.6.7.8" }),
    });
  });

  it("almacena userId null cuando no se pasa userId", async () => {
    await logAudit({ action: "LOGIN_FAILED" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("almacena userId null cuando userId es null explícito", async () => {
    await logAudit({ userId: null, action: "LOGIN_FAILED" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("swallows errors silently sin propagar la excepción", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection failed"));
    await expect(logAudit({ action: "ORDER_PAID" })).resolves.toBeUndefined();
  });

  it("pasa el campo meta correctamente", async () => {
    const meta = { orderId: "ord-1", provider: "stripe" };
    await logAudit({ action: "ORDER_PAID", meta });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ meta }),
    });
  });

  it("meta queda undefined cuando no se pasa el parámetro", async () => {
    await logAudit({ action: "LOGOUT" });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.meta).toBeUndefined();
  });
});
