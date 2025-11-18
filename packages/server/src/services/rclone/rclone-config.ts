import type { ProviderType } from "../../db/schema/destination";

interface RcloneConfigOptions {
	remoteName: string;
	providerType: ProviderType;
	config: Record<string, unknown>;
}

/**
 * Generate rclone config section for a provider
 */
export function generateRcloneConfig({
	remoteName,
	providerType,
	config,
}: RcloneConfigOptions): string {
	const lines: string[] = [];
	lines.push(`[${remoteName}]`);

	switch (providerType) {
		case "s3":
			lines.push("type = s3");
			if (config.provider) lines.push(`provider = ${config.provider}`);
			if (config.accessKeyId)
				lines.push(`access_key_id = ${config.accessKeyId}`);
			if (config.secretAccessKey)
				lines.push(`secret_access_key = ${config.secretAccessKey}`);
			if (config.region) lines.push(`region = ${config.region}`);
			if (config.endpoint) lines.push(`endpoint = ${config.endpoint}`);
			break;

		case "google-drive":
			lines.push("type = drive");
			if (config.clientId) lines.push(`client_id = ${config.clientId}`);
			if (config.clientSecret)
				lines.push(`client_secret = ${config.clientSecret}`);
			if (config.token) lines.push(`token = ${config.token}`);
			if (config.rootFolderId)
				lines.push(`root_folder_id = ${config.rootFolderId}`);
			if (config.teamDrive) lines.push(`team_drive = ${config.teamDrive}`);
			lines.push("scope = drive");
			break;

		case "onedrive":
			lines.push("type = onedrive");
			if (config.clientId) lines.push(`client_id = ${config.clientId}`);
			if (config.clientSecret)
				lines.push(`client_secret = ${config.clientSecret}`);
			if (config.token) lines.push(`token = ${config.token}`);
			if (config.driveId) lines.push(`drive_id = ${config.driveId}`);
			if (config.driveType) lines.push(`drive_type = ${config.driveType}`);
			break;

		case "dropbox":
			lines.push("type = dropbox");
			if (config.clientId) lines.push(`client_id = ${config.clientId}`);
			if (config.clientSecret)
				lines.push(`client_secret = ${config.clientSecret}`);
			if (config.token) lines.push(`token = ${config.token}`);
			break;

		case "ftp":
			lines.push("type = ftp");
			if (config.host) lines.push(`host = ${config.host}`);
			if (config.port) lines.push(`port = ${config.port}`);
			if (config.user) lines.push(`user = ${config.user}`);
			if (config.pass) lines.push(`pass = ${config.pass}`);
			if (config.tls) lines.push(`tls = ${config.tls}`);
			if (config.explicitTls) lines.push(`explicit_tls = ${config.explicitTls}`);
			break;

		case "sftp":
			lines.push("type = sftp");
			if (config.host) lines.push(`host = ${config.host}`);
			if (config.port) lines.push(`port = ${config.port}`);
			if (config.user) lines.push(`user = ${config.user}`);
			if (config.pass) lines.push(`pass = ${config.pass}`);
			if (config.keyPem) lines.push(`key_pem = ${config.keyPem}`);
			if (config.keyFile) lines.push(`key_file = ${config.keyFile}`);
			if (config.knownHostsFile)
				lines.push(`known_hosts_file = ${config.knownHostsFile}`);
			break;

		case "webdav":
			lines.push("type = webdav");
			if (config.url) lines.push(`url = ${config.url}`);
			if (config.vendor) lines.push(`vendor = ${config.vendor}`);
			if (config.user) lines.push(`user = ${config.user}`);
			if (config.pass) lines.push(`pass = ${config.pass}`);
			break;

		case "local":
			lines.push("type = alias");
			if (config.path) lines.push(`remote = ${config.path}`);
			break;

		case "crypt":
			lines.push("type = crypt");
			if (config.remote) lines.push(`remote = ${config.remote}`);
			if (config.password) lines.push(`password = ${config.password}`);
			if (config.password2) lines.push(`password2 = ${config.password2}`);
			if (config.filenameEncryption)
				lines.push(`filename_encryption = ${config.filenameEncryption}`);
			break;

		case "custom":
			// For custom config, just return the raw config
			if (config.config && typeof config.config === "string") {
				return config.config;
			}
			break;

		default:
			throw new Error(`Unsupported provider type: ${providerType}`);
	}

	return lines.join("\n");
}

/**
 * Generate full rclone config file with multiple remotes
 */
export function generateRcloneConfigFile(
	remotes: RcloneConfigOptions[],
): string {
	return remotes.map((remote) => generateRcloneConfig(remote)).join("\n\n");
}

/**
 * Obscure a password using rclone's obscure method
 * This is a placeholder - in production, you'd call rclone obscure command
 */
export async function obscurePassword(password: string): Promise<string> {
	// For now, return as-is. In production, execute: rclone obscure <password>
	// and return the obscured result
	return password;
}

/**
 * Reveal an obscured password using rclone's reveal method
 * This is a placeholder - in production, you'd call rclone reveal command
 */
export async function revealPassword(obscured: string): Promise<string> {
	// For now, return as-is. In production, execute: rclone reveal <obscured>
	// and return the plain text result
	return obscured;
}
