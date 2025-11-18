import {
	createDestintation,
	decryptDestinationConfig,
	execAsync,
	execAsyncRemote,
	findDestinationById,
	getAllProviders,
	getProviderById,
	IS_CLOUD,
	removeDestinationById,
	testDestinationConnection,
	updateDestinationById,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	apiCreateDestination,
	apiFindOneDestination,
	apiRemoveDestination,
	apiUpdateDestination,
	destinations,
} from "@/server/db/schema";

export const destinationRouter = createTRPCRouter({
	create: adminProcedure
		.input(apiCreateDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				return await createDestintation(
					input,
					ctx.session.activeOrganizationId,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error creating the destination",
					cause: error,
				});
			}
		}),
	testConnection: adminProcedure
		.input(
			z.object({
				destinationId: z.string().optional(),
				// Legacy S3 fields for pre-creation testing
				name: z.string().optional(),
				providerType: z.string().optional(),
				provider: z.string().optional(),
				accessKey: z.string().optional(),
				secretAccessKey: z.string().optional(),
				bucket: z.string().optional(),
				region: z.string().optional(),
				endpoint: z.string().optional(),
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// If testing existing destination
				if (input.destinationId) {
					const result = await testDestinationConnection(input.destinationId);
					if (!result.success) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: result.error || "Connection test failed",
						});
					}
					return result;
				}

				// For legacy S3 testing before creation (backward compatibility)
				const {
					secretAccessKey,
					bucket,
					region,
					endpoint,
					accessKey,
					provider,
					providerType = "s3",
				} = input;

				// Only handle legacy S3 testing here
				if (providerType === "s3" && accessKey && secretAccessKey) {
					const rcloneFlags = [
						`--s3-access-key-id=${accessKey}`,
						`--s3-secret-access-key=${secretAccessKey}`,
						`--s3-region=${region}`,
						`--s3-endpoint=${endpoint}`,
						"--s3-no-check-bucket",
						"--s3-force-path-style",
					];
					if (provider) {
						rcloneFlags.unshift(`--s3-provider=${provider}`);
					}
					const rcloneDestination = `:s3:${bucket}`;
					const rcloneCommand = `rclone ls ${rcloneFlags.join(" ")} "${rcloneDestination}"`;

					if (IS_CLOUD && !input.serverId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Server not found",
						});
					}

					if (IS_CLOUD) {
						await execAsyncRemote(input.serverId || "", rcloneCommand);
					} else {
						await execAsync(rcloneCommand);
					}

					return { success: true };
				}

				// For non-S3 providers, they should save first then test
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Please save the destination first, then use the test button to verify the connection.",
				});
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error
							? error?.message
							: "Error connecting to destination",
					cause: error,
				});
			}
		}),
	one: protectedProcedure
		.input(apiFindOneDestination)
		.query(async ({ input, ctx }) => {
			const destination = await findDestinationById(input.destinationId);
			if (destination.organizationId !== ctx.session.activeOrganizationId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this destination",
				});
			}
			return destination;
		}),
	all: protectedProcedure.query(async ({ ctx }) => {
		const results = await db.query.destinations.findMany({
			where: eq(destinations.organizationId, ctx.session.activeOrganizationId),
			orderBy: [desc(destinations.createdAt)],
		});

		// Decrypt configs for display (UI needs them)
		return results.map((dest) => decryptDestinationConfig(dest));
	}),
	remove: adminProcedure
		.input(apiRemoveDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				const destination = await findDestinationById(input.destinationId);

				if (destination.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to delete this destination",
					});
				}
				return await removeDestinationById(
					input.destinationId,
					ctx.session.activeOrganizationId,
				);
			} catch (error) {
				throw error;
			}
		}),
	update: adminProcedure
		.input(apiUpdateDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				const destination = await findDestinationById(input.destinationId);
				if (destination.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to update this destination",
					});
				}
				return await updateDestinationById(input.destinationId, {
					...input,
					organizationId: ctx.session.activeOrganizationId,
				});
			} catch (error) {
				throw error;
			}
		}),
	getProviders: protectedProcedure.query(() => {
		return getAllProviders();
	}),
	getProviderSchema: protectedProcedure
		.input(z.object({ providerId: z.string() }))
		.query(({ input }) => {
			const provider = getProviderById(input.providerId);
			return {
				id: provider.id,
				name: provider.name,
				description: provider.description,
				requiresOAuth: provider.requiresOAuth,
				supportsEncryption: provider.supportsEncryption,
				// Convert Zod schema to JSON schema for frontend consumption
				schema: provider.configSchema,
			};
		}),
});
