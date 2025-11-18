import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";

export const settings = pgTable("settings", {
	settingsId: text("settingsId")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	// Global resource defaults (stored in user-friendly units: MB and decimal cores)
	globalMemoryReservation: text("globalMemoryReservation"), // MB
	globalMemoryLimit: text("globalMemoryLimit"), // MB
	globalCpuReservation: text("globalCpuReservation"), // decimal cores (e.g., "0.5")
	globalCpuLimit: text("globalCpuLimit"), // decimal cores (e.g., "2.0")
	createdAt: text("createdAt")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text("updatedAt")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

const createSchema = createInsertSchema(settings, {
	settingsId: z.string(),
	globalMemoryReservation: z.string().optional(),
	globalMemoryLimit: z.string().optional(),
	globalCpuReservation: z.string().optional(),
	globalCpuLimit: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const apiGetSettings = createSchema
	.pick({
		settingsId: true,
	})
	.optional();

export const apiUpdateSettings = createSchema.partial().extend({
	globalMemoryReservation: z
		.string()
		.refine(
			(val) => {
				if (!val) return true;
				const num = Number.parseFloat(val);
				return num >= 64 && num <= 8192;
			},
			{ message: "Memory reservation must be between 64 MB and 8192 MB" },
		)
		.optional(),
	globalMemoryLimit: z
		.string()
		.refine(
			(val) => {
				if (!val) return true;
				const num = Number.parseFloat(val);
				return num >= 128 && num <= 16384;
			},
			{ message: "Memory limit must be between 128 MB and 16384 MB" },
		)
		.optional(),
	globalCpuReservation: z
		.string()
		.refine(
			(val) => {
				if (!val) return true;
				const num = Number.parseFloat(val);
				return num >= 0.1 && num <= 4.0;
			},
			{ message: "CPU reservation must be between 0.1 and 4.0 cores" },
		)
		.optional(),
	globalCpuLimit: z
		.string()
		.refine(
			(val) => {
				if (!val) return true;
				const num = Number.parseFloat(val);
				return num >= 0.25 && num <= 8.0;
			},
			{ message: "CPU limit must be between 0.25 and 8.0 cores" },
		)
		.optional(),
});

export type Settings = typeof settings.$inferSelect;
