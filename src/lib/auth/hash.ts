import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const MAX_PASSWORD_BYTE_LIMIT = 72;
const KEY_LENGTH = 64;

/**
 * Transforms a plaintext string credentials entry into an isolated, secure cryptographic hash
 * using a native scrypt derivation matrix with an embedded crypto salt.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim() === "") {
    throw new Error("Validation Failure: Secure password entry cannot be initialized empty.");
  }

  if (password.length > MAX_PASSWORD_BYTE_LIMIT) {
    throw new Error(`Validation Failure: Password string length exceeds maximum security limit of ${MAX_PASSWORD_BYTE_LIMIT} characters.`);
  }

  try {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    
    // Return a structured salt-key pair that can be stored in a single string column
    return `${salt}:${derivedKey.toString("hex")}`;
  } catch (error) {
    console.error("CRITICAL SECURITY EXCEPTION: Password encryption process failure:", error);
    throw new Error("Internal security hashing engine encountered an operation failure.");
  }
}

/**
 * Compares an incoming text credential against a known database storage string hash safely
 * using timing-attack safe equality buffers.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || password.trim() === "" || hash.trim() === "") {
    return false;
  }

  if (password.length > MAX_PASSWORD_BYTE_LIMIT) {
    return false;
  }

  try {
    const [salt, storedKeyHex] = hash.split(":");
    if (!salt || !storedKeyHex) return false;

    const currentKeyBuffer = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const storedKeyBuffer = Buffer.from(storedKeyHex, "hex");

    // Prevent timing-attack timing side-channel discovery
    return timingSafeEqual(currentKeyBuffer, storedKeyBuffer);
  } catch (error) {
    console.error("SECURITY WARNING: Exception occurred during pass-verification compare sequences:", error);
    return false;
  }
}