import {
	getProvider,
	PROVIDERS,
} from "@dokploy/server/services/rclone/rclone-providers";
import { describe, expect, test } from "vitest";

describe("rclone providers", () => {
	describe("PROVIDERS constant", () => {
		test("should include all expected provider types", () => {
			const providerKeys = Object.keys(PROVIDERS);

			expect(providerKeys).toContain("s3");
			expect(providerKeys).toContain("ftp");
			expect(providerKeys).toContain("sftp");
			expect(providerKeys).toContain("google-drive");
			expect(providerKeys).toContain("onedrive");
			expect(providerKeys).toContain("dropbox");
			expect(providerKeys).toContain("webdav");
			expect(providerKeys).toContain("local");
			expect(providerKeys).toContain("crypt");
			expect(providerKeys).toContain("custom");
		});

		test("each provider should have required metadata", () => {
			for (const [key, provider] of Object.entries(PROVIDERS)) {
				expect(provider.id).toBe(key);
				expect(provider.name).toBeTruthy();
				expect(typeof provider.name).toBe("string");
				expect(provider.description).toBeTruthy();
				expect(typeof provider.description).toBe("string");
				expect(typeof provider.requiresOAuth).toBe("boolean");
			}
		});

		test("S3 provider should have correct metadata", () => {
			const s3 = PROVIDERS.s3;

			expect(s3.id).toBe("s3");
			expect(s3.name).toBe("S3 Compatible");
			expect(s3.description).toContain("S3");
			expect(s3.requiresOAuth).toBe(false);
		});

		test("Google Drive provider should have correct metadata", () => {
			const gdrive = PROVIDERS["google-drive"];

			expect(gdrive.id).toBe("google-drive");
			expect(gdrive.name).toBe("Google Drive");
			expect(gdrive.requiresOAuth).toBe(true);
		});

		test("FTP provider should have correct metadata", () => {
			const ftp = PROVIDERS.ftp;

			expect(ftp.id).toBe("ftp");
			expect(ftp.name).toBe("FTP/FTPS");
			expect(ftp.requiresOAuth).toBe(false);
		});

		test("SFTP provider should have correct metadata", () => {
			const sftp = PROVIDERS.sftp;

			expect(sftp.id).toBe("sftp");
			expect(sftp.name).toBe("SFTP");
			expect(sftp.requiresOAuth).toBe(false);
		});
	});

	describe("getProvider", () => {
		test("should return correct provider for valid ID", () => {
			const s3 = getProvider("s3");
			expect(s3).toBeDefined();
			expect(s3?.id).toBe("s3");
		});

		test("should return correct provider for all valid IDs", () => {
			const providerIds = [
				"s3",
				"ftp",
				"sftp",
				"google-drive",
				"onedrive",
				"dropbox",
				"webdav",
				"local",
				"crypt",
				"custom",
			];

			for (const id of providerIds) {
				const provider = getProvider(id);
				expect(provider).toBeDefined();
				expect(provider?.id).toBe(id);
			}
		});

		test("should return undefined for invalid provider ID", () => {
			const invalid = getProvider("invalid-provider");
			expect(invalid).toBeUndefined();
		});

		test("should return undefined for empty string", () => {
			const invalid = getProvider("");
			expect(invalid).toBeUndefined();
		});

		test("should be case-sensitive", () => {
			const invalid = getProvider("S3"); // uppercase
			expect(invalid).toBeUndefined();
		});
	});

	describe("Provider categorization", () => {
		test("should identify OAuth providers correctly", () => {
			const oauthProviders = Object.values(PROVIDERS).filter(
				(p) => p.requiresOAuth,
			);

			const oauthIds = oauthProviders.map((p) => p.id);
			expect(oauthIds).toContain("google-drive");
			expect(oauthIds).toContain("onedrive");
			expect(oauthIds).toContain("dropbox");
		});

		test("should identify non-OAuth providers correctly", () => {
			const nonOAuthProviders = Object.values(PROVIDERS).filter(
				(p) => !p.requiresOAuth,
			);

			const nonOAuthIds = nonOAuthProviders.map((p) => p.id);
			expect(nonOAuthIds).toContain("s3");
			expect(nonOAuthIds).toContain("ftp");
			expect(nonOAuthIds).toContain("sftp");
			expect(nonOAuthIds).toContain("webdav");
			expect(nonOAuthIds).toContain("local");
			expect(nonOAuthIds).toContain("crypt");
			expect(nonOAuthIds).toContain("custom");
		});
	});

	describe("Provider schema validation", () => {
		test("S3 provider should have schema with required fields", () => {
			const s3 = PROVIDERS.s3;
			expect(s3.schema).toBeDefined();

			// Schema should be defined in the actual implementation
			// This test ensures the schema property exists
			if (s3.schema) {
				expect(typeof s3.schema).toBe("object");
			}
		});

		test("FTP provider should have schema with required fields", () => {
			const ftp = PROVIDERS.ftp;
			expect(ftp.schema).toBeDefined();

			if (ftp.schema) {
				expect(typeof ftp.schema).toBe("object");
			}
		});

		test("SFTP provider should have schema with required fields", () => {
			const sftp = PROVIDERS.sftp;
			expect(sftp.schema).toBeDefined();

			if (sftp.schema) {
				expect(typeof sftp.schema).toBe("object");
			}
		});
	});

	describe("Provider icons", () => {
		test("each provider should have an icon field", () => {
			for (const provider of Object.values(PROVIDERS)) {
				// Icon field should exist (could be string or component)
				expect(provider).toHaveProperty("icon");
			}
		});
	});

	describe("Provider consistency", () => {
		test("provider ID should match the key in PROVIDERS object", () => {
			for (const [key, provider] of Object.entries(PROVIDERS)) {
				expect(provider.id).toBe(key);
			}
		});

		test("all providers should have unique IDs", () => {
			const ids = Object.values(PROVIDERS).map((p) => p.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		test("all providers should have unique names", () => {
			const names = Object.values(PROVIDERS).map((p) => p.name);
			const uniqueNames = new Set(names);
			expect(uniqueNames.size).toBe(names.length);
		});
	});

	describe("Provider count", () => {
		test("should have exactly 10 providers", () => {
			const count = Object.keys(PROVIDERS).length;
			expect(count).toBe(10);
		});
	});
});
