import {
	clearAllSessions,
	createOAuthSession,
	deleteOAuthSession,
	getActiveSessions,
	getOAuthSession,
	getOAuthSessionByState,
	updateOAuthSession,
	verifyOAuthState,
} from "@dokploy/server/services/oauth/oauth-session";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("OAuth Session Management", () => {
	beforeEach(() => {
		// Clear all sessions before each test
		clearAllSessions();
		// Mock timers for expiration testing
		vi.useFakeTimers();
	});

	afterEach(() => {
		clearAllSessions();
		vi.useRealTimers();
	});

	describe("createOAuthSession", () => {
		test("should create a new OAuth session with valid data", () => {
			const session = createOAuthSession("google-drive");

			expect(session).toMatchObject({
				provider: "google-drive",
			});
			expect(session.sessionId).toBeDefined();
			expect(session.state).toBeDefined();
			expect(session.sessionId.length).toBeGreaterThan(32);
			expect(session.state.length).toBeGreaterThan(32);
			expect(session.createdAt).toBeInstanceOf(Date);
			expect(session.expiresAt).toBeInstanceOf(Date);
			expect(session.expiresAt.getTime()).toBeGreaterThan(
				session.createdAt.getTime(),
			);
		});

		test("should create sessions with unique sessionId and state", () => {
			const session1 = createOAuthSession("google-drive");
			const session2 = createOAuthSession("onedrive");

			expect(session1.sessionId).not.toBe(session2.sessionId);
			expect(session1.state).not.toBe(session2.state);
		});

		test("should set expiration to 10 minutes from creation", () => {
			const session = createOAuthSession("dropbox");
			const expectedExpiry = new Date(
				session.createdAt.getTime() + 10 * 60 * 1000,
			);

			expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
		});
	});

	describe("getOAuthSession", () => {
		test("should retrieve existing session by ID", () => {
			const created = createOAuthSession("google-drive");
			const retrieved = getOAuthSession(created.sessionId);

			expect(retrieved).toEqual(created);
		});

		test("should return undefined for non-existent session", () => {
			const session = getOAuthSession("non-existent-id");

			expect(session).toBeUndefined();
		});

		test("should return undefined for expired session", () => {
			const session = createOAuthSession("google-drive");

			// Fast-forward 11 minutes
			vi.advanceTimersByTime(11 * 60 * 1000);

			const retrieved = getOAuthSession(session.sessionId);
			expect(retrieved).toBeUndefined();
		});

		test("should delete expired session when accessed", () => {
			const session = createOAuthSession("google-drive");

			// Fast-forward 11 minutes
			vi.advanceTimersByTime(11 * 60 * 1000);

			getOAuthSession(session.sessionId);

			// Verify session is deleted
			const activeSessions = getActiveSessions();
			expect(activeSessions).toHaveLength(0);
		});
	});

	describe("getOAuthSessionByState", () => {
		test("should retrieve session by state parameter", () => {
			const created = createOAuthSession("google-drive");
			const retrieved = getOAuthSessionByState(created.state);

			expect(retrieved).toEqual(created);
		});

		test("should return undefined for non-existent state", () => {
			const session = getOAuthSessionByState("non-existent-state");

			expect(session).toBeUndefined();
		});

		test("should return undefined for expired session", () => {
			const session = createOAuthSession("google-drive");

			// Fast-forward 11 minutes
			vi.advanceTimersByTime(11 * 60 * 1000);

			const retrieved = getOAuthSessionByState(session.state);
			expect(retrieved).toBeUndefined();
		});

		test("should find correct session when multiple exist", () => {
			const session1 = createOAuthSession("google-drive");
			const session2 = createOAuthSession("onedrive");
			const session3 = createOAuthSession("dropbox");

			const retrieved = getOAuthSessionByState(session2.state);

			expect(retrieved).toEqual(session2);
			expect(retrieved?.provider).toBe("onedrive");
		});
	});

	describe("updateOAuthSession", () => {
		test("should update session with new data", () => {
			const session = createOAuthSession("google-drive");

			const updated = updateOAuthSession(session.sessionId, {
				destinationName: "My Backup",
				accessToken: "test-access-token",
				refreshToken: "test-refresh-token",
				userEmail: "user@example.com",
				userName: "Test User",
			});

			expect(updated).toMatchObject({
				sessionId: session.sessionId,
				state: session.state,
				provider: "google-drive",
				destinationName: "My Backup",
				accessToken: "test-access-token",
				refreshToken: "test-refresh-token",
				userEmail: "user@example.com",
				userName: "Test User",
			});
		});

		test("should return undefined for non-existent session", () => {
			const updated = updateOAuthSession("non-existent-id", {
				accessToken: "token",
			});

			expect(updated).toBeUndefined();
		});

		test("should preserve existing fields when updating", () => {
			const session = createOAuthSession("google-drive");

			updateOAuthSession(session.sessionId, {
				destinationName: "My Backup",
			});

			const updated = updateOAuthSession(session.sessionId, {
				accessToken: "test-token",
			});

			expect(updated?.destinationName).toBe("My Backup");
			expect(updated?.accessToken).toBe("test-token");
		});
	});

	describe("deleteOAuthSession", () => {
		test("should delete existing session", () => {
			const session = createOAuthSession("google-drive");

			const deleted = deleteOAuthSession(session.sessionId);
			expect(deleted).toBe(true);

			const retrieved = getOAuthSession(session.sessionId);
			expect(retrieved).toBeUndefined();
		});

		test("should return false for non-existent session", () => {
			const deleted = deleteOAuthSession("non-existent-id");
			expect(deleted).toBe(false);
		});
	});

	describe("verifyOAuthState", () => {
		test("should return true for matching state", () => {
			const session = createOAuthSession("google-drive");

			const valid = verifyOAuthState(session.sessionId, session.state);
			expect(valid).toBe(true);
		});

		test("should return false for mismatched state", () => {
			const session = createOAuthSession("google-drive");

			const valid = verifyOAuthState(session.sessionId, "wrong-state");
			expect(valid).toBe(false);
		});

		test("should return false for non-existent session", () => {
			const valid = verifyOAuthState("non-existent-id", "some-state");
			expect(valid).toBe(false);
		});
	});

	describe("getActiveSessions", () => {
		test("should return empty array when no sessions exist", () => {
			const sessions = getActiveSessions();
			expect(sessions).toEqual([]);
		});

		test("should return all active sessions", () => {
			const session1 = createOAuthSession("google-drive");
			const session2 = createOAuthSession("onedrive");
			const session3 = createOAuthSession("dropbox");

			const sessions = getActiveSessions();

			expect(sessions).toHaveLength(3);
			expect(sessions).toContainEqual(session1);
			expect(sessions).toContainEqual(session2);
			expect(sessions).toContainEqual(session3);
		});

		test("should exclude expired sessions", () => {
			createOAuthSession("google-drive");
			createOAuthSession("onedrive");

			// Fast-forward 11 minutes
			vi.advanceTimersByTime(11 * 60 * 1000);

			const session3 = createOAuthSession("dropbox");

			const sessions = getActiveSessions();

			expect(sessions).toHaveLength(1);
			expect(sessions[0]).toEqual(session3);
		});
	});

	describe("Session Expiration", () => {
		test("should clean up expired sessions automatically", () => {
			createOAuthSession("google-drive");
			createOAuthSession("onedrive");

			// Fast-forward 11 minutes
			vi.advanceTimersByTime(11 * 60 * 1000);

			// Create new session to trigger cleanup
			createOAuthSession("dropbox");

			const sessions = getActiveSessions();
			expect(sessions).toHaveLength(1);
			expect(sessions[0]?.provider).toBe("dropbox");
		});

		test("should keep sessions that haven't expired", () => {
			const session1 = createOAuthSession("google-drive");
			const session2 = createOAuthSession("onedrive");

			// Fast-forward 5 minutes (not expired)
			vi.advanceTimersByTime(5 * 60 * 1000);

			const sessions = getActiveSessions();
			expect(sessions).toHaveLength(2);
		});
	});

	describe("CSRF Protection", () => {
		test("should generate cryptographically random state", () => {
			const session1 = createOAuthSession("google-drive");
			const session2 = createOAuthSession("google-drive");

			// States should be unique and long enough
			expect(session1.state).not.toBe(session2.state);
			expect(session1.state.length).toBeGreaterThanOrEqual(64);
			expect(session2.state.length).toBeGreaterThanOrEqual(64);
		});

		test("should properly validate state in callback", () => {
			const session = createOAuthSession("google-drive");

			// Valid state
			expect(verifyOAuthState(session.sessionId, session.state)).toBe(true);

			// Modified state (CSRF attack)
			expect(
				verifyOAuthState(session.sessionId, session.state + "tampered"),
			).toBe(false);
		});
	});
});
