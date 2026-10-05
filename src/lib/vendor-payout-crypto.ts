import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const KEY_NAME = "VENDOR_PAYOUT_ENCRYPTION_KEY";

function key() {
  const encoded = process.env[KEY_NAME];
  if (!encoded) throw new Error("Payout destination storage is not configured.");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("Payout destination storage is not configured.");
  return value;
}

export function encryptPayoutReference(reference: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(reference, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptPayoutReference(value: string) {
  const [version, encodedIv, encodedCiphertext, encodedTag] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext || !encodedTag) throw new Error("Stored payout destination is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function payoutReferenceHash(reference: string) {
  return createHmac("sha256", key()).update(reference).digest("hex");
}
