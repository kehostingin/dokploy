import { z } from "zod";

// Provider metadata
export interface ProviderMetadata {
	id: string;
	name: string;
	description: string;
	requiresOAuth: boolean;
	supportsEncryption: boolean;
	configSchema: z.ZodSchema;
}

// S3 config schema
export const s3ConfigSchema = z.object({
	provider: z.string().optional(), // aws, minio, etc.
	accessKeyId: z.string(),
	secretAccessKey: z.string(),
	region: z.string(),
	endpoint: z.string().optional(),
	bucket: z.string(),
});

// Google Drive config schema
export const googleDriveConfigSchema = z.object({
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
	token: z.string(), // OAuth token JSON
	rootFolderId: z.string().optional(),
	teamDrive: z.string().optional(),
});

// OneDrive config schema
export const oneDriveConfigSchema = z.object({
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
	token: z.string(), // OAuth token JSON
	driveId: z.string().optional(),
	driveType: z.enum(["personal", "business", "sharepoint"]).optional(),
});

// Dropbox config schema
export const dropboxConfigSchema = z.object({
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
	token: z.string(), // OAuth token JSON
});

// FTP config schema
export const ftpConfigSchema = z.object({
	host: z.string(),
	port: z.number().default(21),
	user: z.string(),
	pass: z.string(),
	tls: z.boolean().default(false),
	explicitTls: z.boolean().default(false),
});

// SFTP config schema
export const sftpConfigSchema = z.object({
	host: z.string(),
	port: z.number().default(22),
	user: z.string(),
	pass: z.string().optional(),
	keyFile: z.string().optional(), // Path to SSH key
	keyPem: z.string().optional(), // SSH key content
	knownHostsFile: z.string().optional(),
});

// WebDAV config schema
export const webdavConfigSchema = z.object({
	url: z.string().url(),
	vendor: z.enum(["nextcloud", "owncloud", "sharepoint", "other"]).optional(),
	user: z.string(),
	pass: z.string(),
});

// Crypt config schema
export const cryptConfigSchema = z.object({
	remote: z.string(), // Base remote name
	password: z.string(), // Encryption password (will be obscured)
	password2: z.string().optional(), // Salt password (will be obscured)
	filenameEncryption: z.enum(["standard", "obfuscate", "off"]).default("standard"),
});

// Local config schema
export const localConfigSchema = z.object({
	path: z.string(), // Local filesystem path
});

// Custom config - just raw rclone config
export const customConfigSchema = z.object({
	config: z.string(), // Raw rclone config snippet
});

// Provider definitions
export const PROVIDERS: Record<string, ProviderMetadata> = {
	s3: {
		id: "s3",
		name: "S3 Compatible",
		description: "AWS S3, MinIO, DigitalOcean Spaces, etc.",
		requiresOAuth: false,
		supportsEncryption: true,
		configSchema: s3ConfigSchema,
	},
	"google-drive": {
		id: "google-drive",
		name: "Google Drive",
		description: "Google Drive cloud storage",
		requiresOAuth: true,
		supportsEncryption: true,
		configSchema: googleDriveConfigSchema,
	},
	onedrive: {
		id: "onedrive",
		name: "OneDrive",
		description: "Microsoft OneDrive",
		requiresOAuth: true,
		supportsEncryption: true,
		configSchema: oneDriveConfigSchema,
	},
	dropbox: {
		id: "dropbox",
		name: "Dropbox",
		description: "Dropbox cloud storage",
		requiresOAuth: true,
		supportsEncryption: true,
		configSchema: dropboxConfigSchema,
	},
	ftp: {
		id: "ftp",
		name: "FTP",
		description: "FTP/FTPS server",
		requiresOAuth: false,
		supportsEncryption: true,
		configSchema: ftpConfigSchema,
	},
	sftp: {
		id: "sftp",
		name: "SFTP",
		description: "SSH File Transfer Protocol",
		requiresOAuth: false,
		supportsEncryption: true,
		configSchema: sftpConfigSchema,
	},
	webdav: {
		id: "webdav",
		name: "WebDAV",
		description: "WebDAV server (Nextcloud, ownCloud, etc.)",
		requiresOAuth: false,
		supportsEncryption: true,
		configSchema: webdavConfigSchema,
	},
	local: {
		id: "local",
		name: "Local Filesystem",
		description: "Local directory on the server",
		requiresOAuth: false,
		supportsEncryption: false,
		configSchema: localConfigSchema,
	},
	crypt: {
		id: "crypt",
		name: "Encrypted Remote",
		description: "Encryption wrapper for any remote",
		requiresOAuth: false,
		supportsEncryption: false, // Already encrypted
		configSchema: cryptConfigSchema,
	},
	custom: {
		id: "custom",
		name: "Custom Configuration",
		description: "Custom rclone configuration snippet",
		requiresOAuth: false,
		supportsEncryption: true,
		configSchema: customConfigSchema,
	},
};

// Helper to get provider metadata
export function getProvider(providerId: string): ProviderMetadata | undefined {
	return PROVIDERS[providerId];
}

// Helper to validate provider config
export function validateProviderConfig(
	providerId: string,
	config: unknown,
): z.SafeParseReturnType<unknown, unknown> {
	const provider = getProvider(providerId);
	if (!provider) {
		return {
			success: false,
			error: new z.ZodError([
				{
					code: "custom",
					message: `Unknown provider: ${providerId}`,
					path: [],
				},
			]),
		};
	}

	return provider.configSchema.safeParse(config);
}
