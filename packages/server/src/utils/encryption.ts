import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";

/**
 * Encryption configuration
 */
const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 * In production, this should be stored in environment variables
 */
function getEncryptionKey(): Buffer {
	const secret = process.env.DOKPLOY_ENCRYPTION_SECRET;

	if (!secret) {
		throw new Error(
			"DOKPLOY_ENCRYPTION_SECRET environment variable is required for encryption",
		);
	}

	// Derive a key from the secret using scrypt
	const salt = process.env.DOKPLOY_ENCRYPTION_SALT || "dokploy-salt";
	return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64-encoded string with format: salt:iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
	try {
		const key = getEncryptionKey();
		const iv = randomBytes(IV_LENGTH);
		const salt = randomBytes(SALT_LENGTH);

		const cipher = createCipheriv(ALGORITHM, key, iv);

		let encrypted = cipher.update(plaintext, "utf8", "base64");
		encrypted += cipher.final("base64");

		const authTag = cipher.getAuthTag();

		// Combine salt, iv, authTag, and encrypted data
		const combined = Buffer.concat([
			salt,
			iv,
			authTag,
			Buffer.from(encrypted, "base64"),
		]);

		return combined.toString("base64");
	} catch (error) {
		throw new Error(
			`Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Decrypt data encrypted with encrypt()
 * Expects base64-encoded string with format: salt:iv:authTag:encryptedData
 */
export function decrypt(encryptedData: string): string {
	try {
		const key = getEncryptionKey();
		const combined = Buffer.from(encryptedData, "base64");

		// Extract components
		const salt = combined.subarray(0, SALT_LENGTH);
		const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
		const authTag = combined.subarray(
			SALT_LENGTH + IV_LENGTH,
			SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
		);
		const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted.toString("base64"), "base64", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	} catch (error) {
		throw new Error(
			`Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Encrypt JSON object
 */
export function encryptJSON(data: unknown): string {
	return encrypt(JSON.stringify(data));
}

/**
 * Decrypt JSON object
 */
export function decryptJSON<T = unknown>(encryptedData: string): T {
	const decrypted = decrypt(encryptedData);
	return JSON.parse(decrypted) as T;
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
	return !!process.env.DOKPLOY_ENCRYPTION_SECRET;
}

/**
 * Generate a random encryption secret (for initial setup)
 */
export function generateEncryptionSecret(): string {
	return randomBytes(32).toString("base64");
}
