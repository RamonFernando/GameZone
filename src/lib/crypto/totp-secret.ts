/**
 * Cifrado del secreto TOTP en reposo (AES-256-GCM).
 *
 * El secreto TOTP es tan sensible como una contraseña: con él se pueden generar
 * los códigos 2FA de un usuario. Por eso no debe guardarse en texto plano en la
 * BD. Aquí lo ciframos al guardar y lo desciframos solo al verificar.
 *
 * Formato del valor cifrado: `v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>`.
 * El prefijo `v1:` permite distinguir un valor cifrado de un secreto en texto
 * plano legado (base32, sin `:`), de modo que la migración sea transparente.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const PREFIX = "v1";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "Falta ENCRYPTION_KEY. Genera una con: node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64'))\" y añádela al .env."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe ser de 32 bytes en base64 (AES-256). Longitud actual: ${key.length} bytes.`
    );
  }
  return key;
}

/** Indica si un valor almacenado ya está cifrado con este esquema. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

/** Cifra un secreto en texto plano y devuelve el string a guardar en BD. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Descifra un secreto almacenado. Si el valor es un secreto en texto plano
 * legado (sin prefijo `v1:`), lo devuelve tal cual para no bloquear a usuarios
 * que activaron TOTP antes de aplicar el cifrado.
 */
export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) {
    return stored; // legado en texto plano
  }
  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Formato de secreto cifrado inválido.");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
