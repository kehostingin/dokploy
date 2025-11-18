import {
	decrypt,
	encrypt,
	isEncryptionConfigured,
} from "@dokploy/server/utils/encryption";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("Encryption utilities", () => {
	const originalEnv = process.env.DOKPLOY_ENCRYPTION_SECRET;

	beforeEach(() => {
		// Reset environment variable before each test
		vi.resetModules();
	});

	afterEach(() => {
		// Restore original environment
		if (originalEnv) {
			process.env.DOKPLOY_ENCRYPTION_SECRET = originalEnv;
		} else {
			delete process.env.DOKPLOY_ENCRYPTION_SECRET;
		}
	});

	describe("isEncryptionConfigured", () => {
		test("should return true when DOKPLOY_ENCRYPTION_SECRET is set", () => {
			process.env.DOKPLOY_ENCRYPTION_SECRET =
				"test-secret-key-with-sufficient-length-for-security";
			expect(isEncryptionConfigured()).toBe(true);
		});

		test("should return false when DOKPLOY_ENCRYPTION_SECRET is not set", () => {
			delete process.env.DOKPLOY_ENCRYPTION_SECRET;
			expect(isEncryptionConfigured()).toBe(false);
		});

		test("should return false when DOKPLOY_ENCRYPTION_SECRET is empty string", () => {
			process.env.DOKPLOY_ENCRYPTION_SECRET = "";
			expect(isEncryptionConfigured()).toBe(false);
		});
	});

	describe("encrypt and decrypt", () => {
		beforeEach(() => {
			// Set a test encryption secret
			process.env.DOKPLOY_ENCRYPTION_SECRET =
				"test-secret-key-with-sufficient-length-for-security-purposes";
		});

		test("should encrypt and decrypt a simple string", () => {
			const plaintext = "Hello, World!";
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(encrypted).not.toBe(plaintext);
			expect(decrypted).toBe(plaintext);
		});

		test("should encrypt and decrypt JSON data", () => {
			const jsonData = JSON.stringify({
				host: "example.com",
				port: 22,
				user: "admin",
				pass: "secret123",
			});

			const encrypted = encrypt(jsonData);
			const decrypted = decrypt(encrypted);

			expect(encrypted).not.toBe(jsonData);
			expect(decrypted).toBe(jsonData);
			expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
		});

		test("should encrypt and decrypt sensitive credentials", () => {
			const credentials = "AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG";
			const encrypted = encrypt(credentials);
			const decrypted = decrypt(encrypted);

			expect(encrypted).not.toBe(credentials);
			expect(encrypted).not.toContain("AKIAIOSFODNN7EXAMPLE");
			expect(decrypted).toBe(credentials);
		});

		test("should produce different ciphertext for same plaintext (IV)", () => {
			const plaintext = "Same message";
			const encrypted1 = encrypt(plaintext);
			const encrypted2 = encrypt(plaintext);

			// Different ciphertexts due to different IVs
			expect(encrypted1).not.toBe(encrypted2);
			// But both should decrypt to same plaintext
			expect(decrypt(encrypted1)).toBe(plaintext);
			expect(decrypt(encrypted2)).toBe(plaintext);
		});

		test("should handle empty string", () => {
			const plaintext = "";
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("should handle special characters", () => {
			const plaintext = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("should handle unicode characters", () => {
			const plaintext = "Hello 世界 🌍";
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("should handle multi-line text", () => {
			const plaintext = "Line 1\nLine 2\nLine 3";
			const encrypted = encrypt(plaintext);
			const decrypted = decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("should handle SSH private key format", () => {
			const sshKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAw7C8xVa3K...
...
-----END RSA PRIVATE KEY-----`;

			const encrypted = encrypt(sshKey);
			const decrypted = decrypt(encrypted);

			expect(encrypted).not.toContain("BEGIN RSA PRIVATE KEY");
			expect(decrypted).toBe(sshKey);
		});

		test("should throw error when decrypting invalid ciphertext", () => {
			expect(() => decrypt("invalid-ciphertext")).toThrow();
		});

		test("should throw error when decrypting with wrong format", () => {
			expect(() => decrypt("not:base64:encoded")).toThrow();
		});

		test("should throw error when encryption secret is not set", () => {
			delete process.env.DOKPLOY_ENCRYPTION_SECRET;
			expect(() => encrypt("test")).toThrow();
		});

		test("should throw error when decryption secret is not set", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);

			delete process.env.DOKPLOY_ENCRYPTION_SECRET;
			expect(() => decrypt(encrypted)).toThrow();
		});

		test("should throw error when decrypting with wrong secret", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);

			// Change the secret
			process.env.DOKPLOY_ENCRYPTION_SECRET =
				"different-secret-key-that-wont-work-for-decryption";

			expect(() => decrypt(encrypted)).toThrow();
		});
	});

	describe("Security properties", () => {
		beforeEach(() => {
			process.env.DOKPLOY_ENCRYPTION_SECRET =
				"test-secret-key-with-sufficient-length-for-security-purposes";
		});

		test("encrypted output should be base64 encoded with colons", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);

			// Should have two colons separating IV, auth tag, and ciphertext
			const parts = encrypted.split(":");
			expect(parts).toHaveLength(3);

			// Each part should be valid base64
			for (const part of parts) {
				expect(part).toMatch(/^[A-Za-z0-9+/]+=*$/);
			}
		});

		test("should use authenticated encryption (GCM mode)", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);
			const parts = encrypted.split(":");

			expect(parts).toHaveLength(3);
			// IV should be 12 bytes (16 base64 chars)
			expect(parts[0].length).toBeGreaterThanOrEqual(16);
			// Auth tag should be 16 bytes (around 24 base64 chars)
			expect(parts[1].length).toBeGreaterThanOrEqual(20);
		});

		test("should detect tampering with ciphertext", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);
			const parts = encrypted.split(":");

			// Tamper with the ciphertext
			const tamperedCiphertext = parts[2].slice(0, -1) + "X";
			const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

			expect(() => decrypt(tampered)).toThrow();
		});

		test("should detect tampering with auth tag", () => {
			const plaintext = "test";
			const encrypted = encrypt(plaintext);
			const parts = encrypted.split(":");

			// Tamper with the auth tag
			const tamperedTag = parts[1].slice(0, -1) + "X";
			const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;

			expect(() => decrypt(tampered)).toThrow();
		});
	});

	describe("Performance", () => {
		beforeEach(() => {
			process.env.DOKPLOY_ENCRYPTION_SECRET =
				"test-secret-key-with-sufficient-length-for-security-purposes";
		});

		test("should handle large text efficiently", () => {
			const largePlaintext = "x".repeat(10000);
			const startTime = Date.now();
			const encrypted = encrypt(largePlaintext);
			const decrypted = decrypt(encrypted);
			const endTime = Date.now();

			expect(decrypted).toBe(largePlaintext);
			// Should complete in reasonable time (< 1 second)
			expect(endTime - startTime).toBeLessThan(1000);
		});
	});
});
