import { randomBytes } from "node:crypto";

/**
 * OAuth session data stored temporarily during OAuth flow
 */
export interface OAuthSession {
	sessionId: string;
	state: string; // CSRF protection state
	provider: string; // google-drive, onedrive, dropbox
	destinationName?: string; // Optional: pre-filled name
	createdAt: Date;
	expiresAt: Date;
	// OAuth response data (populated after callback)
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
	tokenType?: string;
	scope?: string;
	// User info (optional, from provider)
	userEmail?: string;
	userName?: string;
	userId?: string;
}

/**
 * In-memory storage for OAuth sessions
 * In production, this should be Redis or database-backed
 */
const sessions = new Map<string, OAuthSession>();

/**
 * Session TTL: 10 minutes
 */
const SESSION_TTL = 10 * 60 * 1000;

/**
 * Create a new OAuth session
 */
export const createOAuthSession = (provider: string): OAuthSession => {
	const sessionId = randomBytes(32).toString("hex");
	const state = randomBytes(32).toString("hex");
	const now = new Date();

	const session: OAuthSession = {
		sessionId,
		state,
		provider,
		createdAt: now,
		expiresAt: new Date(now.getTime() + SESSION_TTL),
	};

	sessions.set(sessionId, session);

	// Clean up expired sessions
	cleanupExpiredSessions();

	return session;
};

/**
 * Get OAuth session by ID
 */
export const getOAuthSession = (
	sessionId: string,
): OAuthSession | undefined => {
	const session = sessions.get(sessionId);

	if (!session) {
		return undefined;
	}

	// Check if expired
	if (session.expiresAt < new Date()) {
		sessions.delete(sessionId);
		return undefined;
	}

	return session;
};

/**
 * Get OAuth session by state parameter
 */
export const getOAuthSessionByState = (
	state: string,
): OAuthSession | undefined => {
	cleanupExpiredSessions();

	for (const session of sessions.values()) {
		if (session.state === state && session.expiresAt >= new Date()) {
			return session;
		}
	}

	return undefined;
};

/**
 * Update OAuth session with token data
 */
export const updateOAuthSession = (
	sessionId: string,
	data: Partial<OAuthSession>,
): OAuthSession | undefined => {
	const session = sessions.get(sessionId);

	if (!session) {
		return undefined;
	}

	const updated = {
		...session,
		...data,
	};

	sessions.set(sessionId, updated);
	return updated;
};

/**
 * Delete OAuth session
 */
export const deleteOAuthSession = (sessionId: string): boolean => {
	return sessions.delete(sessionId);
};

/**
 * Verify OAuth state parameter (CSRF protection)
 */
export const verifyOAuthState = (
	sessionId: string,
	state: string,
): boolean => {
	const session = sessions.get(sessionId);

	if (!session) {
		return false;
	}

	return session.state === state;
};

/**
 * Clean up expired sessions
 */
const cleanupExpiredSessions = (): void => {
	const now = new Date();

	for (const [sessionId, session] of sessions.entries()) {
		if (session.expiresAt < now) {
			sessions.delete(sessionId);
		}
	}
};

/**
 * Get all active sessions (for debugging)
 */
export const getActiveSessions = (): OAuthSession[] => {
	cleanupExpiredSessions();
	return Array.from(sessions.values());
};

/**
 * Clear all sessions (for testing)
 */
export const clearAllSessions = (): void => {
	sessions.clear();
};
