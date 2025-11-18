import {
	getGlobalResourceSettings,
	updateGlobalResourceSettings,
} from "@dokploy/server/services/resource-settings";
import { apiUpdateSettings } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const resourceSettingsRouter = createTRPCRouter({
	get: adminProcedure.query(async ({ ctx }) => {
		try {
			return await getGlobalResourceSettings();
		} catch (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch resource settings",
			});
		}
	}),

	update: adminProcedure
		.input(apiUpdateSettings)
		.mutation(async ({ input, ctx }) => {
			try {
				return await updateGlobalResourceSettings({
					globalMemoryReservation: input.globalMemoryReservation,
					globalMemoryLimit: input.globalMemoryLimit,
					globalCpuReservation: input.globalCpuReservation,
					globalCpuLimit: input.globalCpuLimit,
				});
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update resource settings",
				});
			}
		}),
});
