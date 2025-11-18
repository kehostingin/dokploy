import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createOAuthSession,
	deleteOAuthSession,
	exchangeDropboxCode,
	exchangeGoogleDriveCode,
	exchangeOneDriveCode,
	getDropboxAuthUrl,
	getDropboxUserInfo,
	getGoogleDriveAuthUrl,
	getGoogleDriveUserInfo,
	getOAuthSession,
	getOneDriveAuthUrl,
	getOneDriveUserInfo,
	isDropboxOAuthConfigured,
	isGoogleDriveOAuthConfigured,
	isOneDriveOAuthConfigured,
	updateOAuthSession,
	verifyOAuthState,
} from "@dokploy/server/services/oauth";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const oauthRouter = createTRPCRouter({
	/**
	 * Initiate OAuth flow for a provider
	 */
	initiate: adminProcedure
		.input(
			z.object({
				provider: z.enum(["google-drive", "onedrive", "dropbox"]),
				destinationName: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { provider, destinationName } = input;

			// Check if provider OAuth is configured
			if (provider === "google-drive" && !isGoogleDriveOAuthConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"Google Drive OAuth is not configured. Please set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET environment variables.",
				});
			}

			if (provider === "onedrive" && !isOneDriveOAuthConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"OneDrive OAuth is not configured. Please set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET environment variables.",
				});
			}

			if (provider === "dropbox" && !isDropboxOAuthConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"Dropbox OAuth is not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET environment variables.",
				});
			}

			// Create OAuth session
			const session = createOAuthSession(provider);

			if (destinationName) {
				updateOAuthSession(session.sessionId, { destinationName });
			}

			// Generate authorization URL
			let authUrl: string;
			switch (provider) {
				case "google-drive":
					authUrl = getGoogleDriveAuthUrl(session);
					break;
				case "onedrive":
					authUrl = getOneDriveAuthUrl(session);
					break;
				case "dropbox":
					authUrl = getDropboxAuthUrl(session);
					break;
				default:
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Unsupported provider: ${provider}`,
					});
			}

			return {
				sessionId: session.sessionId,
				authUrl,
			};
		}),

	/**
	 * Handle OAuth callback and exchange code for tokens
	 */
	callback: adminProcedure
		.input(
			z.object({
				sessionId: z.string(),
				code: z.string(),
				state: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const { sessionId, code, state } = input;

			// Verify session exists
			const session = getOAuthSession(sessionId);
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "OAuth session not found or expired",
				});
			}

			// Verify state (CSRF protection)
			if (!verifyOAuthState(sessionId, state)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Invalid OAuth state parameter",
				});
			}

			// Exchange code for tokens
			try {
				let tokenData: any;
				let userInfo: any;

				switch (session.provider) {
					case "google-drive": {
						tokenData = await exchangeGoogleDriveCode(code);
						userInfo = await getGoogleDriveUserInfo(tokenData.access_token);
						break;
					}
					case "onedrive": {
						tokenData = await exchangeOneDriveCode(code);
						userInfo = await getOneDriveUserInfo(tokenData.access_token);
						break;
					}
					case "dropbox": {
						tokenData = await exchangeDropboxCode(code);
						userInfo = await getDropboxUserInfo(tokenData.access_token);
						break;
					}
					default:
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Unsupported provider: ${session.provider}`,
						});
				}

				// Update session with token data
				const updatedSession = updateOAuthSession(sessionId, {
					accessToken: tokenData.access_token,
					refreshToken: tokenData.refresh_token,
					expiresIn: tokenData.expires_in,
					tokenType: tokenData.token_type,
					scope: tokenData.scope,
					userEmail:
						userInfo.email ||
						userInfo.mail ||
						userInfo.userPrincipalName ||
						"",
					userName:
						userInfo.name ||
						userInfo.displayName ||
						userInfo.name?.display_name ||
						"",
					userId: userInfo.id || userInfo.account_id || "",
				});

				return {
					success: true,
					sessionId,
					userEmail: updatedSession?.userEmail,
					userName: updatedSession?.userName,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to complete OAuth flow",
				});
			}
		}),

	/**
	 * Get OAuth session status
	 */
	getSession: adminProcedure
		.input(
			z.object({
				sessionId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			const session = getOAuthSession(input.sessionId);

			if (!session) {
				return {
					found: false,
					sessionId: input.sessionId,
				};
			}

			return {
				found: true,
				sessionId: session.sessionId,
				provider: session.provider,
				destinationName: session.destinationName,
				userEmail: session.userEmail,
				userName: session.userName,
				hasToken: !!session.accessToken,
				expiresAt: session.expiresAt,
			};
		}),

	/**
	 * Get OAuth token data from session (for creating destination)
	 */
	getTokenData: adminProcedure
		.input(
			z.object({
				sessionId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			const session = getOAuthSession(input.sessionId);

			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "OAuth session not found or expired",
				});
			}

			if (!session.accessToken) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "OAuth flow not completed yet",
				});
			}

			// Build token JSON for rclone
			const tokenJson = {
				access_token: session.accessToken,
				token_type: session.tokenType || "Bearer",
				refresh_token: session.refreshToken,
				expiry: session.expiresIn
					? new Date(
							Date.now() + session.expiresIn * 1000,
						).toISOString()
					: undefined,
			};

			return {
				provider: session.provider,
				tokenJson: JSON.stringify(tokenJson),
				userEmail: session.userEmail,
				userName: session.userName,
				userId: session.userId,
				destinationName: session.destinationName,
			};
		}),

	/**
	 * Delete OAuth session (cleanup)
	 */
	deleteSession: adminProcedure
		.input(
			z.object({
				sessionId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const deleted = deleteOAuthSession(input.sessionId);
			return { success: deleted };
		}),

	/**
	 * Check OAuth configuration status
	 */
	getConfigStatus: adminProcedure.query(async () => {
		return {
			"google-drive": isGoogleDriveOAuthConfigured(),
			onedrive: isOneDriveOAuthConfigured(),
			dropbox: isDropboxOAuthConfigured(),
		};
	}),
});
