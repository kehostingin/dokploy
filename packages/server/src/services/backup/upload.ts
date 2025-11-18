import { findDestinationById } from "../destination";
import {
	createTempRcloneConfig,
	generateRcloneConfig,
	rcloneCopy,
} from "../rclone";

/**
 * Upload a backup file to a destination
 * Automatically routes to S3 SDK or rclone based on destination type
 */
export async function uploadToDestination(opts: {
	filePath: string;
	fileName: string;
	destinationId: string;
	remotePath?: string;
}): Promise<{ success: boolean; error?: string }> {
	const { filePath, fileName, destinationId, remotePath = "" } = opts;

	try {
		// Get destination with decrypted config
		const destination = await findDestinationById(destinationId, true);

		// Legacy S3 upload using AWS SDK
		if (
			destination.providerType === "s3" &&
			!destination.rcloneConfig &&
			destination.accessKey &&
			destination.bucket
		) {
			// Import S3 uploader dynamically to avoid loading it for rclone destinations
			const { uploadToS3 } = await import("./s3-upload");
			return await uploadToS3({
				filePath,
				fileName,
				destination,
				remotePath,
			});
		}

		// rclone-based upload for all other providers
		if (!destination.rcloneConfig && !destination.customConfig) {
			throw new Error(
				"No configuration found for this destination. Please reconfigure the destination.",
			);
		}

		// Parse rclone config
		let config: Record<string, unknown> = {};
		if (destination.rcloneConfig) {
			try {
				config = JSON.parse(destination.rcloneConfig);
			} catch (error) {
				throw new Error("Invalid rclone configuration format");
			}
		}

		// Generate rclone config file
		const remoteName = `backup-${destination.destinationId}`;
		const rcloneConfigContent =
			destination.customConfig ||
			generateRcloneConfig({
				remoteName,
				providerType: destination.providerType as any,
				config,
			});

		// Create temporary config file
		const configPath = await createTempRcloneConfig(rcloneConfigContent);

		// Construct remote path
		const fullRemotePath = remotePath ? `${remotePath}/${fileName}` : fileName;

		// Upload using rclone
		const result = await rcloneCopy(
			{
				remoteName,
				remotePath: fullRemotePath,
				localPath: filePath,
				direction: "upload",
			},
			{ configPath },
		);

		if (!result.success) {
			return {
				success: false,
				error: result.stderr || result.error?.message || "Upload failed",
			};
		}

		return { success: true };
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return {
			success: false,
			error: errorMessage,
		};
	}
}
