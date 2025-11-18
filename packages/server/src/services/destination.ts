import { db } from "@dokploy/server/db";
import {
	type apiCreateDestination,
	destinations,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { decrypt, encrypt, isEncryptionConfigured } from "../utils/encryption";
import {
	createTempRcloneConfig,
	generateRcloneConfig,
	getProvider,
	PROVIDERS,
	rcloneTest,
} from "./rclone";

export type Destination = typeof destinations.$inferSelect;

export const createDestintation = async (
	input: typeof apiCreateDestination._type,
	organizationId: string,
) => {
	// Encrypt rclone config if present
	let encryptedRcloneConfig: string | undefined;
	if (input.rcloneConfig) {
		if (!isEncryptionConfigured()) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Encryption is not configured. Please set DOKPLOY_ENCRYPTION_SECRET environment variable.",
			});
		}
		encryptedRcloneConfig = encrypt(input.rcloneConfig);
	}

	const newDestination = await db
		.insert(destinations)
		.values({
			...input,
			rcloneConfig: encryptedRcloneConfig,
			organizationId: organizationId,
		})
		.returning()
		.then((value) => value[0]);

	if (!newDestination) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error input: Inserting destination",
		});
	}

	return newDestination;
};

/**
 * Helper function to decrypt rclone config from a destination
 */
export const decryptDestinationConfig = (
	destination: Destination,
): Destination => {
	if (destination.rcloneConfig) {
		try {
			return {
				...destination,
				rcloneConfig: decrypt(destination.rcloneConfig),
			};
		} catch (error) {
			console.error("Failed to decrypt rclone config:", error);
			// Return destination with encrypted config if decryption fails
			return destination;
		}
	}
	return destination;
};

export const findDestinationById = async (
	destinationId: string,
	decryptConfig = true,
) => {
	const destination = await db.query.destinations.findFirst({
		where: and(eq(destinations.destinationId, destinationId)),
	});
	if (!destination) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Destination not found",
		});
	}

	// Decrypt config if requested
	return decryptConfig ? decryptDestinationConfig(destination) : destination;
};

export const removeDestinationById = async (
	destinationId: string,
	organizationId: string,
) => {
	const result = await db
		.delete(destinations)
		.where(
			and(
				eq(destinations.destinationId, destinationId),
				eq(destinations.organizationId, organizationId),
			),
		)
		.returning();

	return result[0];
};

export const updateDestinationById = async (
	destinationId: string,
	destinationData: Partial<Destination>,
) => {
	// Encrypt rclone config if present in update
	const updateData = { ...destinationData };
	if (updateData.rcloneConfig) {
		if (!isEncryptionConfigured()) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Encryption is not configured. Please set DOKPLOY_ENCRYPTION_SECRET environment variable.",
			});
		}
		updateData.rcloneConfig = encrypt(updateData.rcloneConfig);
	}

	const result = await db
		.update(destinations)
		.set(updateData)
		.where(
			and(
				eq(destinations.destinationId, destinationId),
				eq(destinations.organizationId, destinationData.organizationId || ""),
			),
		)
		.returning();

	return result[0];
};

/**
 * Test a destination connection
 */
export const testDestinationConnection = async (
	destinationId: string,
): Promise<{ success: boolean; error?: string }> => {
	try {
		// Get destination with decrypted config
		const destination = await findDestinationById(destinationId, true);

		// For legacy S3 destinations without rclone config
		if (
			destination.providerType === "s3" &&
			!destination.rcloneConfig &&
			destination.accessKey &&
			destination.bucket
		) {
			// Legacy S3 - we could test with AWS SDK here
			// For now, just return success (TODO: implement S3 SDK test)
			return { success: true };
		}

		// For rclone-based destinations
		if (!destination.rcloneConfig && !destination.customConfig) {
			throw new Error("No configuration found for this destination");
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
		const remoteName = `test-${destination.destinationId}`;
		const rcloneConfigContent =
			destination.customConfig ||
			generateRcloneConfig({
				remoteName,
				providerType: destination.providerType as any,
				config,
			});

		// Create temporary config file
		const configPath = await createTempRcloneConfig(rcloneConfigContent);

		// Test connection using rclone
		const result = await rcloneTest(remoteName, { configPath });

		// Update last tested timestamp
		await db
			.update(destinations)
			.set({
				lastTestedAt: new Date(),
				lastError: result.success
					? null
					: result.stderr || result.error?.message,
			})
			.where(eq(destinations.destinationId, destinationId));

		if (!result.success) {
			return {
				success: false,
				error:
					result.stderr || result.error?.message || "Connection test failed",
			};
		}

		return { success: true };
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		// Update last error
		await db
			.update(destinations)
			.set({
				lastTestedAt: new Date(),
				lastError: errorMessage,
			})
			.where(eq(destinations.destinationId, destinationId));

		return {
			success: false,
			error: errorMessage,
		};
	}
};

/**
 * Get all available providers
 */
export const getAllProviders = () => {
	return Object.values(PROVIDERS);
};

/**
 * Get provider by ID
 */
export const getProviderById = (providerId: string) => {
	const provider = getProvider(providerId);
	if (!provider) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Provider ${providerId} not found`,
		});
	}
	return provider;
};
