import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("session token", () => {
  it("crea y verifica un token válido", async () => {
    const token = await createSessionToken({
      userId: "user-test",
      email: "user@test.dev",
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-test");
    expect(payload?.email).toBe("user@test.dev");
  });

  it("rechaza un token manipulado", async () => {
    const token = await createSessionToken({
      userId: "user-test",
      email: "user@test.dev",
    });

    const tamperedToken = `${token}x`;
    const payload = await verifySessionToken(tamperedToken);
    expect(payload).toBeNull();
  });
});
