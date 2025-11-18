import type { OAuthSession } from "./oauth-session";

/**
 * OneDrive OAuth configuration
 */
export interface OneDriveOAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

/**
 * OneDrive OAuth token response
 */
interface OneDriveTokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	token_type: string;
}

/**
 * OneDrive user info response
 */
interface OneDriveUserInfo {
	id: string;
	displayName: string;
	mail?: string;
	userPrincipalName?: string;
}

/**
 * Microsoft OAuth endpoints
 */
const MICROSOFT_AUTH_URL =
	"https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL =
	"https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

/**
 * OneDrive OAuth scopes
 */
const ONEDRIVE_SCOPES = [
	"Files.ReadWrite.All", // Access to user's files
	"User.Read", // User profile
	"offline_access", // Refresh token
];

/**
 * Get OAuth configuration from environment
 */
export const getOneDriveOAuthConfig = (): OneDriveOAuthConfig => {
	const clientId = process.env.ONEDRIVE_CLIENT_ID;
	const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
	const redirectUri =
		process.env.ONEDRIVE_REDIRECT_URI ||
		`${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/onedrive`;

	if (!clientId || !clientSecret) {
		throw new Error(
			"OneDrive OAuth not configured. Set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET environment variables.",
		);
	}

	return {
		clientId,
		clientSecret,
		redirectUri,
	};
};

/**
 * Generate OneDrive OAuth authorization URL
 */
export const getOneDriveAuthUrl = (session: OAuthSession): string => {
	const config = getOneDriveOAuthConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: "code",
		scope: ONEDRIVE_SCOPES.join(" "),
		state: session.state,
		response_mode: "query",
	});

	return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeOneDriveCode = async (
	code: string,
): Promise<OneDriveTokenResponse> => {
	const config = getOneDriveOAuthConfig();

	const response = await fetch(MICROSOFT_TOKEN_URL, {
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
			`Failed to exchange OneDrive authorization code: ${error}`,
		);
	}

	return response.json();
};

/**
 * Refresh OneDrive access token
 */
export const refreshOneDriveToken = async (
	refreshToken: string,
): Promise<OneDriveTokenResponse> => {
	const config = getOneDriveOAuthConfig();

	const response = await fetch(MICROSOFT_TOKEN_URL, {
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
		throw new Error(`Failed to refresh OneDrive token: ${error}`);
	}

	return response.json();
};

/**
 * Get OneDrive user info
 */
export const getOneDriveUserInfo = async (
	accessToken: string,
): Promise<OneDriveUserInfo> => {
	const response = await fetch(MICROSOFT_USERINFO_URL, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get OneDrive user info: ${error}`);
	}

	return response.json();
};

/**
 * Check if OneDrive OAuth is configured
 */
export const isOneDriveOAuthConfigured = (): boolean => {
	return !!(
		process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET
	);
};
