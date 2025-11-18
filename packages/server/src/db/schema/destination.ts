import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { organization } from "./account";
import { backups } from "./backups";

export const destinations = pgTable("destination", {
	destinationId: text("destinationId")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text("name").notNull(),

	// Multi-provider support
	providerType: text("provider_type").default("s3"),
	rcloneConfig: text("rclone_config"), // Encrypted JSON config
	customConfig: text("custom_config"), // Custom rclone snippet
	lastTestedAt: timestamp("last_tested_at"),
	lastError: text("last_error"),

	// Legacy S3 fields (now optional for backward compatibility)
	provider: text("provider"),
	accessKey: text("accessKey"),
	secretAccessKey: text("secretAccessKey"),
	bucket: text("bucket"),
	region: text("region"),
	endpoint: text("endpoint"),

	organizationId: text("organizationId")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const destinationsRelations = relations(
	destinations,
	({ many, one }) => ({
		backups: many(backups),
		organization: one(organization, {
			fields: [destinations.organizationId],
			references: [organization.id],
		}),
	}),
);

// Provider type enum
export const providerTypeSchema = z.enum([
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

export type ProviderType = z.infer<typeof providerTypeSchema>;

const createSchema = createInsertSchema(destinations, {
	destinationId: z.string(),
	name: z.string().min(1),
	providerType: providerTypeSchema,
	rcloneConfig: z.string().optional(),
	customConfig: z.string().optional(),
	lastTestedAt: z.date().optional(),
	lastError: z.string().optional(),
	// Legacy S3 fields (optional now)
	provider: z.string().optional(),
	accessKey: z.string().optional(),
	bucket: z.string().optional(),
	endpoint: z.string().optional(),
	secretAccessKey: z.string().optional(),
	region: z.string().optional(),
});

export const apiCreateDestination = createSchema
	.pick({
		name: true,
		providerType: true,
		rcloneConfig: true,
		customConfig: true,
		// Legacy S3 fields
		provider: true,
		accessKey: true,
		bucket: true,
		region: true,
		endpoint: true,
		secretAccessKey: true,
	})
	.extend({
		serverId: z.string().optional(),
	})
	.refine(
		(data) => {
			// For S3 legacy, require S3 fields
			if (data.providerType === "s3" && !data.rcloneConfig) {
				return !!(data.accessKey && data.bucket && data.region && data.secretAccessKey);
			}
			// For non-S3 or rclone-based, require rcloneConfig or customConfig
			if (data.providerType && data.providerType !== "s3") {
				return !!(data.rcloneConfig || data.customConfig);
			}
			return true;
		},
		{
			message: "Invalid destination configuration for provider type",
		},
	);

export const apiFindOneDestination = createSchema
	.pick({
		destinationId: true,
	})
	.required();

export const apiRemoveDestination = createSchema
	.pick({
		destinationId: true,
	})
	.required();

export const apiUpdateDestination = createSchema
	.pick({
		destinationId: true,
		name: true,
		providerType: true,
		rcloneConfig: true,
		customConfig: true,
		// Legacy S3 fields
		provider: true,
		accessKey: true,
		bucket: true,
		region: true,
		endpoint: true,
		secretAccessKey: true,
	})
	.required({
		destinationId: true,
	})
	.extend({
		serverId: z.string().optional(),
	});
