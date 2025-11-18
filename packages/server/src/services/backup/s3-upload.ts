import { createReadStream } from "node:fs";
import type { Destination } from "../destination";

/**
 * Upload to S3 using AWS SDK (legacy S3 destinations)
 * This is kept for backward compatibility with existing S3 destinations
 */
export async function uploadToS3(opts: {
	filePath: string;
	fileName: string;
	destination: Destination;
	remotePath?: string;
}): Promise<{ success: boolean; error?: string }> {
	const { filePath, fileName, destination, remotePath = "" } = opts;

	try {
		// Import AWS SDK dynamically
		const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

		if (
			!destination.accessKey ||
			!destination.secretAccessKey ||
			!destination.bucket ||
			!destination.region
		) {
			throw new Error("Missing required S3 credentials");
		}

		// Create S3 client
		const s3Client = new S3Client({
			region: destination.region,
			credentials: {
				accessKeyId: destination.accessKey,
				secretAccessKey: destination.secretAccessKey,
			},
			...(destination.endpoint && {
				endpoint: destination.endpoint,
				forcePathStyle: true, // Required for MinIO and other S3-compatible services
			}),
		});

		// Read file
		const fileStream = createReadStream(filePath);

		// Construct S3 key
		const key = remotePath ? `${remotePath}/${fileName}` : fileName;

		// Upload to S3
		const command = new PutObjectCommand({
			Bucket: destination.bucket,
			Key: key,
			Body: fileStream,
		});

		await s3Client.send(command);

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
