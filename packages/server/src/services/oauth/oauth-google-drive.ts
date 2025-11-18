import type { OAuthSession } from "./oauth-session";

/**
 * Google Drive OAuth configuration
 */
export interface GoogleDriveOAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

/**
 * Google Drive OAuth token response
 */
interface GoogleDriveTokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	token_type: string;
}

/**
 * Google Drive user info response
 */
interface GoogleDriveUserInfo {
	email: string;
	name: string;
	id: string;
	picture?: string;
}

/**
 * Google OAuth endpoints
 */
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL =
	"https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Google Drive OAuth scopes
 */
const GOOGLE_DRIVE_SCOPES = [
	"https://www.googleapis.com/auth/drive.file", // Access to files created by the app
	"https://www.googleapis.com/auth/userinfo.email", // User email
	"https://www.googleapis.com/auth/userinfo.profile", // User profile
];

/**
 * Get OAuth configuration from environment
 */
export const getGoogleDriveOAuthConfig = (): GoogleDriveOAuthConfig => {
	const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
	const redirectUri =
		process.env.GOOGLE_DRIVE_REDIRECT_URI ||
		`${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/google-drive`;

	if (!clientId || !clientSecret) {
		throw new Error(
			"Google Drive OAuth not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET environment variables.",
		);
	}

	return {
		clientId,
		clientSecret,
		redirectUri,
	};
};

/**
 * Generate Google Drive OAuth authorization URL
 */
export const getGoogleDriveAuthUrl = (session: OAuthSession): string => {
	const config = getGoogleDriveOAuthConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: "code",
		scope: GOOGLE_DRIVE_SCOPES.join(" "),
		state: session.state,
		access_type: "offline", // Request refresh token
		prompt: "consent", // Force consent screen to get refresh token
	});

	return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeGoogleDriveCode = async (
	code: string,
): Promise<GoogleDriveTokenResponse> => {
	const config = getGoogleDriveOAuthConfig();

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(
			`Failed to exchange Google Drive authorization code: ${error}`,
		);
	}

	return response.json();
};

/**
 * Refresh Google Drive access token
 */
export const refreshGoogleDriveToken = async (
	refreshToken: string,
): Promise<GoogleDriveTokenResponse> => {
	const config = getGoogleDriveOAuthConfig();

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			refresh_token: refreshToken,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: "refresh_token",
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to refresh Google Drive token: ${error}`);
	}

	return response.json();
};

/**
 * Get Google Drive user info
 */
export const getGoogleDriveUserInfo = async (
	accessToken: string,
): Promise<GoogleDriveUserInfo> => {
	const response = await fetch(GOOGLE_USERINFO_URL, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get Google Drive user info: ${error}`);
	}

	return response.json();
};

/**
 * Check if Google Drive OAuth is configured
 */
export const isGoogleDriveOAuthConfigured = (): boolean => {
	return !!(
		process.env.GOOGLE_DRIVE_CLIENT_ID &&
		process.env.GOOGLE_DRIVE_CLIENT_SECRET
	);
};
