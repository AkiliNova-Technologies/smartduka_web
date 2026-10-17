import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const required = ["WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT", "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY"] as const;

export type WebPushConfiguration = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function enabledByEnvironment() {
  return process.env.WEB_PUSH_ENABLED === "true";
}

export function getWebPushConfiguration(): WebPushConfiguration | null {
  if (!enabledByEnvironment() || required.some((key) => !process.env[key]?.trim())) return null;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT!.trim();
  if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$|^https:\/\/[^\s/]+/i.test(subject)) return null;
  return { publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY!.trim(), privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY!.trim(), subject };
}

export function webPushPublicConfiguration() {
  const config = getWebPushConfiguration();
  return config ? { enabled: true, publicKey: config.publicKey } : { enabled: false, publicKey: null };
}

function encryptionKey() {
  const value = process.env.WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("Web Push subscription encryption is not configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function hashPushEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function encryptPushSubscriptionValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptPushSubscriptionValue(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted push subscription value.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
}
