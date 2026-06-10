import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret, isEncrypted } from "./totp-secret";

beforeAll(() => {
  // Clave de prueba (32 bytes base64) para no depender del .env real.
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("totp-secret crypto", () => {
  it("cifra y descifra recuperando el secreto original (round-trip)", () => {
    const secret = "JBSWY3DPEHPK3PXP"; // secreto base32 típico
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produce ciphertext distinto cada vez (IV aleatorio)", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("trata un secreto en texto plano legado (sin prefijo) como tal", () => {
    const legacy = "JBSWY3DPEHPK3PXP";
    expect(isEncrypted(legacy)).toBe(false);
    expect(decryptSecret(legacy)).toBe(legacy);
  });

  it("falla al descifrar si el authTag no cuadra (manipulación)", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const parts = encrypted.split(":");
    parts[2] = randomBytes(16).toString("base64"); // authTag falso
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});
