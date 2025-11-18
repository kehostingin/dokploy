import { generateRcloneConfig } from "@dokploy/server/services/rclone/rclone-config";
import { describe, expect, test } from "vitest";

describe("generateRcloneConfig", () => {
	describe("S3 provider", () => {
		test("should generate valid S3 config with all fields", () => {
			const config = generateRcloneConfig({
				remoteName: "my-s3",
				providerType: "s3",
				config: {
					provider: "AWS",
					accessKeyId: "AKIAIOSFODNN7EXAMPLE",
					secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
					region: "us-east-1",
					endpoint: "https://s3.amazonaws.com",
					bucket: "my-bucket",
				},
			});

			expect(config).toContain("[my-s3]");
			expect(config).toContain("type = s3");
			expect(config).toContain("provider = AWS");
			expect(config).toContain("access_key_id = AKIAIOSFODNN7EXAMPLE");
			expect(config).toContain(
				"secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			);
			expect(config).toContain("region = us-east-1");
			expect(config).toContain("endpoint = https://s3.amazonaws.com");
		});

		test("should handle MinIO provider", () => {
			const config = generateRcloneConfig({
				remoteName: "my-minio",
				providerType: "s3",
				config: {
					provider: "Minio",
					accessKeyId: "minioadmin",
					secretAccessKey: "minioadmin",
					endpoint: "http://localhost:9000",
				},
			});

			expect(config).toContain("[my-minio]");
			expect(config).toContain("type = s3");
			expect(config).toContain("provider = Minio");
			expect(config).toContain("endpoint = http://localhost:9000");
		});

		test("should handle optional fields", () => {
			const config = generateRcloneConfig({
				remoteName: "my-s3",
				providerType: "s3",
				config: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			});

			expect(config).toContain("[my-s3]");
			expect(config).toContain("type = s3");
			expect(config).toContain("access_key_id = key");
			expect(config).toContain("secret_access_key = secret");
			// Optional fields should not be present
			expect(config).not.toContain("region =");
			expect(config).not.toContain("endpoint =");
		});
	});

	describe("FTP provider", () => {
		test("should generate valid FTP config", () => {
			const config = generateRcloneConfig({
				remoteName: "my-ftp",
				providerType: "ftp",
				config: {
					host: "ftp.example.com",
					port: 21,
					user: "ftpuser",
					pass: "ftppass",
				},
			});

			expect(config).toContain("[my-ftp]");
			expect(config).toContain("type = ftp");
			expect(config).toContain("host = ftp.example.com");
			expect(config).toContain("port = 21");
			expect(config).toContain("user = ftpuser");
			expect(config).toContain("pass = ftppass");
		});

		test("should handle FTP with TLS", () => {
			const config = generateRcloneConfig({
				remoteName: "my-ftps",
				providerType: "ftp",
				config: {
					host: "ftp.example.com",
					port: 21,
					user: "ftpuser",
					pass: "ftppass",
					tls: true,
				},
			});

			expect(config).toContain("[my-ftps]");
			expect(config).toContain("type = ftp");
			expect(config).toContain("tls = true");
		});

		test("should default to port 21 if not specified", () => {
			const config = generateRcloneConfig({
				remoteName: "my-ftp",
				providerType: "ftp",
				config: {
					host: "ftp.example.com",
					user: "ftpuser",
					pass: "ftppass",
				},
			});

			expect(config).toContain("port = 21");
		});
	});

	describe("SFTP provider", () => {
		test("should generate valid SFTP config with password", () => {
			const config = generateRcloneConfig({
				remoteName: "my-sftp",
				providerType: "sftp",
				config: {
					host: "sftp.example.com",
					port: 22,
					user: "sftpuser",
					pass: "sftppass",
				},
			});

			expect(config).toContain("[my-sftp]");
			expect(config).toContain("type = sftp");
			expect(config).toContain("host = sftp.example.com");
			expect(config).toContain("port = 22");
			expect(config).toContain("user = sftpuser");
			expect(config).toContain("pass = sftppass");
		});

		test("should generate valid SFTP config with SSH key", () => {
			const sshKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...";
			const config = generateRcloneConfig({
				remoteName: "my-sftp",
				providerType: "sftp",
				config: {
					host: "sftp.example.com",
					port: 22,
					user: "sftpuser",
					keyPem: sshKey,
				},
			});

			expect(config).toContain("[my-sftp]");
			expect(config).toContain("type = sftp");
			expect(config).toContain("key_pem = " + sshKey);
		});

		test("should default to port 22 if not specified", () => {
			const config = generateRcloneConfig({
				remoteName: "my-sftp",
				providerType: "sftp",
				config: {
					host: "sftp.example.com",
					user: "sftpuser",
					pass: "sftppass",
				},
			});

			expect(config).toContain("port = 22");
		});

		test("should handle both password and SSH key", () => {
			const sshKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...";
			const config = generateRcloneConfig({
				remoteName: "my-sftp",
				providerType: "sftp",
				config: {
					host: "sftp.example.com",
					port: 22,
					user: "sftpuser",
					pass: "sftppass",
					keyPem: sshKey,
				},
			});

			// Both should be present (rclone will prefer key)
			expect(config).toContain("pass = sftppass");
			expect(config).toContain("key_pem = " + sshKey);
		});
	});

	describe("Custom provider", () => {
		test("should handle custom provider type", () => {
			const config = generateRcloneConfig({
				remoteName: "my-custom",
				providerType: "custom",
				config: {
					customField1: "value1",
					customField2: "value2",
				},
			});

			// For custom providers, we just pass through the config
			expect(config).toContain("[my-custom]");
			expect(config).toContain("type = custom");
		});
	});

	describe("Remote name handling", () => {
		test("should handle remote names with special characters", () => {
			const config = generateRcloneConfig({
				remoteName: "my-remote-123",
				providerType: "s3",
				config: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			});

			expect(config).toContain("[my-remote-123]");
		});

		test("should handle remote names with underscores", () => {
			const config = generateRcloneConfig({
				remoteName: "my_remote_backup",
				providerType: "s3",
				config: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			});

			expect(config).toContain("[my_remote_backup]");
		});
	});

	describe("Error handling", () => {
		test("should handle missing required fields gracefully", () => {
			// This should not throw, but generate a config with missing fields
			const config = generateRcloneConfig({
				remoteName: "my-remote",
				providerType: "s3",
				config: {},
			});

			expect(config).toContain("[my-remote]");
			expect(config).toContain("type = s3");
		});

		test("should handle null/undefined values", () => {
			const config = generateRcloneConfig({
				remoteName: "my-remote",
				providerType: "s3",
				config: {
					accessKeyId: "key",
					secretAccessKey: undefined,
					region: null,
				} as any,
			});

			expect(config).toContain("[my-remote]");
			expect(config).toContain("access_key_id = key");
			// Undefined/null values should not be included
			expect(config).not.toContain("secret_access_key = undefined");
			expect(config).not.toContain("region = null");
		});
	});
});
