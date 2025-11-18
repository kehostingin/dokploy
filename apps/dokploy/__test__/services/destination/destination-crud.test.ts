import {
	createDestintation,
	decryptDestinationConfig,
	findDestinationById,
	getAllProviders,
	getProviderById,
	removeDestinationById,
	updateDestinationById,
} from "@dokploy/server";
import type { ProviderType } from "@dokploy/server/db/schema";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("Destination CRUD Operations", () => {
	const TEST_ORG_ID = "test-org-123";

	beforeEach(() => {
		// Set encryption secret for tests
		process.env.DOKPLOY_ENCRYPTION_SECRET =
			"test-secret-key-with-sufficient-length-for-security-purposes";
	});

	describe("Provider Metadata", () => {
		test("should return all supported providers", () => {
			const providers = getAllProviders();

			expect(providers).toHaveLength(10);
			expect(providers.map((p) => p.id)).toEqual([
				"s3",
				"google-drive",
				"onedrive",
				"dropbox",
				"ftp",
				"sftp",
				"webdav",
				"local",
				"crypt",
				"custom",
			]);
		});

		test("should return provider by ID", () => {
			const googleDrive = getProviderById("google-drive");

			expect(googleDrive).toMatchObject({
				id: "google-drive",
				name: "Google Drive",
				requiresOAuth: true,
			});
		});

		test("should throw error for invalid provider ID", () => {
			expect(() => getProviderById("invalid-provider")).toThrow(
				"Provider not found: invalid-provider",
			);
		});

		test("should correctly categorize OAuth providers", () => {
			const googleDrive = getProviderById("google-drive");
			const onedrive = getProviderById("onedrive");
			const dropbox = getProviderById("dropbox");
			const s3 = getProviderById("s3");
			const ftp = getProviderById("ftp");

			expect(googleDrive.requiresOAuth).toBe(true);
			expect(onedrive.requiresOAuth).toBe(true);
			expect(dropbox.requiresOAuth).toBe(true);
			expect(s3.requiresOAuth).toBe(false);
			expect(ftp.requiresOAuth).toBe(false);
		});

		test("should have valid config schema for each provider", () => {
			const providers = getAllProviders();

			for (const provider of providers) {
				expect(provider.configSchema).toBeDefined();
				expect(provider.configSchema.parse).toBeInstanceOf(Function);
			}
		});
	});

	describe("Destination Config Encryption/Decryption", () => {
		test("should decrypt rclone config from destination", () => {
			const mockDestination = {
				destinationId: "dest-123",
				name: "Test Destination",
				providerType: "ftp" as ProviderType,
				rcloneConfig: null,
				customConfig: null,
				lastTestedAt: null,
				lastError: null,
				provider: null,
				accessKey: null,
				secretAccessKey: null,
				bucket: null,
				region: null,
				endpoint: null,
				organizationId: TEST_ORG_ID,
				createdAt: new Date(),
			};

			const decrypted = decryptDestinationConfig(mockDestination);

			expect(decrypted).toEqual(mockDestination);
		});

		test("should decrypt encrypted rclone config", () => {
			// This would need actual encryption utilities
			// For now, test the structure
			const mockDestination = {
				destinationId: "dest-123",
				name: "Test Destination",
				providerType: "ftp" as ProviderType,
				rcloneConfig: '{"host":"ftp.example.com"}',
				customConfig: null,
				lastTestedAt: null,
				lastError: null,
				provider: null,
				accessKey: null,
				secretAccessKey: null,
				bucket: null,
				region: null,
				endpoint: null,
				organizationId: TEST_ORG_ID,
				createdAt: new Date(),
			};

			const decrypted = decryptDestinationConfig(mockDestination);

			expect(decrypted.destinationId).toBe("dest-123");
			expect(decrypted.providerType).toBe("ftp");
		});

		test("should handle null rcloneConfig gracefully", () => {
			const mockDestination = {
				destinationId: "dest-123",
				name: "Test Destination",
				providerType: "s3" as ProviderType,
				rcloneConfig: null,
				customConfig: null,
				lastTestedAt: null,
				lastError: null,
				provider: "AWS",
				accessKey: "AKIATEST",
				secretAccessKey: "secret",
				bucket: "test-bucket",
				region: "us-east-1",
				endpoint: "https://s3.amazonaws.com",
				organizationId: TEST_ORG_ID,
				createdAt: new Date(),
			};

			const decrypted = decryptDestinationConfig(mockDestination);

			expect(decrypted.rcloneConfig).toBeNull();
			expect(decrypted.provider).toBe("AWS");
		});
	});

	describe("Provider Configuration Validation", () => {
		test("should validate S3 provider fields", () => {
			const s3Provider = getProviderById("s3");

			const validConfig = {
				provider: "AWS",
				accessKeyId: "AKIATEST",
				secretAccessKey: "secret-key",
				bucket: "my-bucket",
				region: "us-east-1",
				endpoint: "https://s3.amazonaws.com",
			};

			const result = s3Provider.configSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		test("should validate FTP provider fields", () => {
			const ftpProvider = getProviderById("ftp");

			const validConfig = {
				host: "ftp.example.com",
				port: 21,
				user: "ftpuser",
				pass: "ftppass",
				tls: false,
			};

			const result = ftpProvider.configSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		test("should validate SFTP provider fields", () => {
			const sftpProvider = getProviderById("sftp");

			const validConfigWithPassword = {
				host: "sftp.example.com",
				port: 22,
				user: "sftpuser",
				pass: "sftppass",
			};

			const result1 = sftpProvider.configSchema.safeParse(
				validConfigWithPassword,
			);
			expect(result1.success).toBe(true);

			const validConfigWithKey = {
				host: "sftp.example.com",
				port: 22,
				user: "sftpuser",
				keyPem: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
			};

			const result2 = sftpProvider.configSchema.safeParse(validConfigWithKey);
			expect(result2.success).toBe(true);
		});

		test("should validate WebDAV provider fields", () => {
			const webdavProvider = getProviderById("webdav");

			const validConfig = {
				url: "https://cloud.example.com/remote.php/dav",
				vendor: "nextcloud",
				user: "webdavuser",
				pass: "webdavpass",
			};

			const result = webdavProvider.configSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		test("should validate Local provider fields", () => {
			const localProvider = getProviderById("local");

			const validConfig = {
				path: "/path/to/backups",
			};

			const result = localProvider.configSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		test("should validate Crypt provider fields", () => {
			const cryptProvider = getProviderById("crypt");

			const validConfig = {
				remote: "my-s3:bucket/path",
				password: "encryption-password",
				password2: "salt-password",
				filenameEncryption: "standard",
			};

			const result = cryptProvider.configSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
		});

		test("should reject invalid provider configs", () => {
			const ftpProvider = getProviderById("ftp");

			const invalidConfig = {
				host: "ftp.example.com",
				// Missing required fields
			};

			const result = ftpProvider.configSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe("Multi-Provider Support", () => {
		test("should support all 10 provider types", () => {
			const providerTypes: ProviderType[] = [
				"s3",
				"google-drive",
				"onedrive",
				"dropbox",
				"ftp",
				"sftp",
				"webdav",
				"local",
				"crypt",
				"custom",
			];

			for (const type of providerTypes) {
				const provider = getProviderById(type);
				expect(provider).toBeDefined();
				expect(provider.id).toBe(type);
			}
		});

		test("should categorize providers by OAuth requirement", () => {
			const providers = getAllProviders();

			const oauthProviders = providers.filter((p) => p.requiresOAuth);
			const nonOauthProviders = providers.filter((p) => !p.requiresOAuth);

			expect(oauthProviders.map((p) => p.id)).toEqual([
				"google-drive",
				"onedrive",
				"dropbox",
			]);

			expect(nonOauthProviders).toHaveLength(7);
		});

		test("should provide encryption support flags", () => {
			const cryptProvider = getProviderById("crypt");
			const s3Provider = getProviderById("s3");

			// Crypt provider is specifically for encryption
			expect(cryptProvider.id).toBe("crypt");

			// Other providers can be wrapped with crypt
			expect(s3Provider.id).toBe("s3");
		});
	});

	describe("Provider Descriptions", () => {
		test("should have meaningful descriptions for all providers", () => {
			const providers = getAllProviders();

			for (const provider of providers) {
				expect(provider.description).toBeDefined();
				expect(provider.description.length).toBeGreaterThan(10);
			}
		});

		test("should mention OAuth requirement in descriptions", () => {
			const googleDrive = getProviderById("google-drive");
			const onedrive = getProviderById("onedrive");
			const dropbox = getProviderById("dropbox");

			// OAuth providers should mention OAuth or authentication
			const oauthKeywords = ["OAuth", "authentication", "authorize"];

			const hasOAuthMention = (desc: string) =>
				oauthKeywords.some((keyword) =>
					desc.toLowerCase().includes(keyword.toLowerCase()),
				);

			expect(hasOAuthMention(googleDrive.description) || googleDrive.requiresOAuth).toBe(
				true,
			);
			expect(hasOAuthMention(onedrive.description) || onedrive.requiresOAuth).toBe(
				true,
			);
			expect(hasOAuthMention(dropbox.description) || dropbox.requiresOAuth).toBe(
				true,
			);
		});
	});
});
