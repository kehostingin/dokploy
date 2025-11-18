import { TRPCError } from "@trpc/server";
import { db } from "@dokploy/server/db";
import { eq } from "drizzle-orm";
import type { Settings } from "@dokploy/server/db/schema";
import { settings } from "@dokploy/server/db/schema";

// Hardcoded fallback defaults (in user-friendly units: MB and decimal cores)
const DEFAULT_MEMORY_RESERVATION_MB = "256";
const DEFAULT_MEMORY_LIMIT_MB = "1024";
const DEFAULT_CPU_RESERVATION_CORES = "0.5";
const DEFAULT_CPU_LIMIT_CORES = "1";

/**
 * Get or create global resource settings
 * Ensures a settings record always exists
 */
export const getGlobalResourceSettings = async (): Promise<Settings> => {
	// Try to find existing settings
	const existingSettings = await db.query.settings.findFirst();

	if (existingSettings) {
		return existingSettings;
	}

	// Create default settings if none exist
	const newSettings = await db
		.insert(settings)
		.values({})
		.returning()
		.then((rows) => rows[0]);

	if (!newSettings) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create resource settings",
		});
	}

	return newSettings;
};

/**
 * Update global resource settings
 */
export const updateGlobalResourceSettings = async (
	data: Partial<Omit<Settings, "settingsId" | "createdAt" | "updatedAt">>,
): Promise<Settings> => {
	const existingSettings = await getGlobalResourceSettings();

	const updated = await db
		.update(settings)
		.set({
			...data,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(settings.settingsId, existingSettings.settingsId))
		.returning()
		.then((rows) => rows[0]);

	if (!updated) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update resource settings",
		});
	}

	return updated;
};

/**
 * Get default resource limits with fallback chain:
 * 1. Global settings (if configured)
 * 2. Hardcoded defaults
 *
 * Returns values in Docker API format (bytes and nanoseconds)
 */
export const getDefaultResourceLimits = async (): Promise<{
	memoryReservation: string;
	memoryLimit: string;
	cpuReservation: string;
	cpuLimit: string;
}> => {
	const globalSettings = await getGlobalResourceSettings();

	// Import conversion functions
	const { mbToBytes, coresToNanoseconds } = await import(
		"@dokploy/server/utils/resources/conversions"
	);

	return {
		memoryReservation: globalSettings.globalMemoryReservation
			? mbToBytes(globalSettings.globalMemoryReservation)
			: mbToBytes(DEFAULT_MEMORY_RESERVATION_MB),
		memoryLimit: globalSettings.globalMemoryLimit
			? mbToBytes(globalSettings.globalMemoryLimit)
			: mbToBytes(DEFAULT_MEMORY_LIMIT_MB),
		cpuReservation: globalSettings.globalCpuReservation
			? coresToNanoseconds(globalSettings.globalCpuReservation)
			: coresToNanoseconds(DEFAULT_CPU_RESERVATION_CORES),
		cpuLimit: globalSettings.globalCpuLimit
			? coresToNanoseconds(globalSettings.globalCpuLimit)
			: coresToNanoseconds(DEFAULT_CPU_LIMIT_CORES),
	};
};
