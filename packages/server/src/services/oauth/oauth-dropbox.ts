import type { OAuthSession } from "./oauth-session";

/**
 * Dropbox OAuth configuration
 */
export interface DropboxOAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

/**
 * Dropbox OAuth token response
 */
interface DropboxTokenResponse {
	access_token: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
	token_type: string;
	account_id: string;
	uid: string;
}

/**
 * Dropbox user info response
 */
interface DropboxUserInfo {
	account_id: string;
	name: {
		given_name: string;
		surname: string;
		familiar_name: string;
		display_name: string;
	};
	email: string;
}

/**
 * Dropbox OAuth endpoints
 */
const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const DROPBOX_USERINFO_URL =
	"https://api.dropboxapi.com/2/users/get_current_account";

/**
 * Get OAuth configuration from environment
 */
export const getDropboxOAuthConfig = (): DropboxOAuthConfig => {
	const clientId = process.env.DROPBOX_CLIENT_ID;
	const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
	const redirectUri =
		process.env.DROPBOX_REDIRECT_URI ||
		`${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/dropbox`;

	if (!clientId || !clientSecret) {
		throw new Error(
			"Dropbox OAuth not configured. Set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET environment variables.",
		);
	}

	return {
		clientId,
		clientSecret,
		redirectUri,
	};
};

/**
 * Generate Dropbox OAuth authorization URL
 */
export const getDropboxAuthUrl = (session: OAuthSession): string => {
	const config = getDropboxOAuthConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: "code",
		state: session.state,
		token_access_type: "offline", // Request refresh token
	});

	return `${DROPBOX_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeDropboxCode = async (
	code: string,
): Promise<DropboxTokenResponse> => {
	const config = getDropboxOAuthConfig();

	const response = await fetch(DROPBOX_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			code,
			grant_type: "authorization_code",
			redirect_uri: config.redirectUri,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to exchange Dropbox authorization code: ${error}`);
	}

	return response.json();
};

/**
 * Refresh Dropbox access token
 */
export const refreshDropboxToken = async (
	refreshToken: string,
): Promise<DropboxTokenResponse> => {
	const config = getDropboxOAuthConfig();

	const response = await fetch(DROPBOX_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to refresh Dropbox token: ${error}`);
	}

	return response.json();
};

/**
 * Get Dropbox user info
 */
export const getDropboxUserInfo = async (
	accessToken: string,
): Promise<DropboxUserInfo> => {
	const response = await fetch(DROPBOX_USERINFO_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get Dropbox user info: ${error}`);
	}

	return response.json();
};

/**
 * Check if Dropbox OAuth is configured
 */
export const isDropboxOAuthConfigured = (): boolean => {
	return !!(
		process.env.DROPBOX_CLIENT_ID && process.env.DROPBOX_CLIENT_SECRET
	);
};
