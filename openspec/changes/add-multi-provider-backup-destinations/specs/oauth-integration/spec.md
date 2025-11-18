# ADDED: OAuth2 Integration for Cloud Storage Providers

## Overview

OAuth2 authentication flow integration for cloud storage providers (Google Drive, OneDrive, Dropbox) to allow secure authorization without storing user passwords.

## Requirements

#### REQ-OAUTH-001: OAuth2 Flow Support
The system MUST support OAuth2 authorization flows for the following providers:
- Google Drive (OAuth 2.0)
- OneDrive (Microsoft OAuth 2.0)
- Dropbox (OAuth 2.0)

#### REQ-OAUTH-002: Authorization Initiation
Users MUST be able to initiate OAuth authorization through a "Authorize with [Provider]" button in the destination configuration form.

#### REQ-OAUTH-003: OAuth Popup Flow
The OAuth authorization MUST:
- Open in a popup window (not full page redirect)
- Display the provider's consent screen
- Automatically close on successful authorization
- Update the parent window with authorization status

#### REQ-OAUTH-004: Token Storage
The system MUST:
- Store OAuth access tokens securely with encryption
- Store refresh tokens for long-term access
- Never expose tokens to the frontend
- Associate tokens with specific destinations

#### REQ-OAUTH-005: Token Refresh
The system MUST automatically refresh expired OAuth tokens:
- Detect token expiration before API calls
- Use refresh token to obtain new access token
- Update stored token automatically
- Retry failed operations after refresh

#### REQ-OAUTH-006: Token Expiration Handling
When an OAuth token cannot be refreshed, the system MUST:
- Mark the destination as "requires re-authorization"
- Notify the user via UI indicator
- Prevent backups to that destination until re-authorized
- Provide clear re-authorization flow

#### REQ-OAUTH-007: OAuth Callback Security
OAuth callback endpoints MUST:
- Validate state parameter to prevent CSRF
- Use HTTPS in production
- Validate redirect URI matches registered URI
- Implement rate limiting
- Log all authorization attempts

#### REQ-OAUTH-008: Session Management
OAuth authorization sessions MUST:
- Expire after 10 minutes if not completed
- Be stored securely (Redis or encrypted database)
- Be tied to the initiating user
- Clean up automatically after expiration

#### REQ-OAUTH-009: Multi-Account Support
Users MUST be able to:
- Authorize multiple accounts for the same provider
- Distinguish between different authorized accounts
- See which account is authorized for each destination

#### REQ-OAUTH-010: Revocation
Users MUST be able to:
- Revoke OAuth authorization from Dokploy
- Be informed that they should also revoke from provider's settings
- Be guided to provider's account settings page

## Scenarios

#### Scenario: Google Drive OAuth Authorization
```gherkin
Given I am creating a new Google Drive destination
When I click "Authorize with Google"
Then a popup window should open
And I should see "dokploy.example.com wants to access your Google Drive"
When I select my Google account
And I click "Allow"
Then the popup should close automatically
And I should see "Successfully authorized as user@gmail.com"
And the access token should be stored encrypted in the database
```

#### Scenario: OAuth Session Timeout
```gherkin
Given I have initiated an OAuth flow
And 11 minutes have passed
When I try to complete the authorization
Then I should see "Authorization session expired"
And I should be prompted to start the authorization again
```

#### Scenario: Token Refresh Success
```gherkin
Given I have a Google Drive destination
And the access token has expired
And the refresh token is still valid
When a backup is triggered to that destination
Then the system should automatically refresh the token
And the backup should proceed without user intervention
And I should not see any error notifications
```

#### Scenario: Token Refresh Failure
```gherkin
Given I have a Google Drive destination
And both access and refresh tokens are expired/invalid
When a backup is triggered to that destination
Then the backup should fail
And I should see a notification "Google Drive authorization expired"
And the destination should show a "Re-authorize" badge
When I click "Re-authorize"
Then I should go through the OAuth flow again
```

#### Scenario: Multiple Google Accounts
```gherkin
Given I want to backup to two different Google Drive accounts
When I create the first destination and authorize with account A
Then I should see "Authorized as userA@gmail.com"
When I create a second destination and authorize with account B
Then I should see "Authorized as userB@gmail.com"
And both destinations should work independently
```

#### Scenario: OAuth State Validation
```gherkin
Given an attacker attempts to forge an OAuth callback
When the callback includes an invalid state parameter
Then the system should reject the authorization
And log the attempt as a security event
And show "Authorization failed: Invalid state"
```

#### Scenario: Callback with Error
```gherkin
Given I am in the middle of OAuth authorization
When I click "Deny" instead of "Allow"
Then the OAuth provider should redirect to callback with error
And the popup should close
And I should see "Authorization denied by user"
And I should be able to try again
```

#### Scenario: Revoke Authorization
```gherkin
Given I have a Google Drive destination authorized
When I click "Revoke Authorization" in the destination settings
Then I should see a confirmation dialog
And a warning "This will prevent backups to this destination"
When I confirm
Then the OAuth token should be deleted from the database
And I should see instructions to revoke from Google's account settings
And the destination should show "Not Authorized" status
```

#### Scenario: OAuth Polling for Status
```gherkin
Given I have clicked "Authorize with Google"
And the popup has opened
When I am on the main window
Then the system should poll for authorization status every 2 seconds
And show a "Waiting for authorization..." message
When I complete authorization in the popup
Then within 2 seconds, the main window should update
And show "Successfully authorized"
And stop polling
```

#### Scenario: Account Information Display
```gherkin
Given I have authorized a Google Drive destination
When I view the destination details
Then I should see:
  - Account email (e.g., "user@gmail.com")
  - Account name (if available)
  - Authorization date
  - Token expiration date
  - Last used date
```

#### Scenario: Re-authorization Preserves Settings
```gherkin
Given I have a configured Google Drive destination
With custom settings (root folder, etc.)
And the OAuth token has expired
When I re-authorize the destination
Then all my custom settings should be preserved
And only the OAuth token should be updated
```

#### Scenario: OneDrive OAuth Flow
```gherkin
Given I am creating a new OneDrive destination
When I click "Authorize with Microsoft"
Then a popup should open to Microsoft login
And I should see "Dokploy wants to access your OneDrive"
When I sign in and allow access
Then the popup should close
And I should see "Successfully authorized as user@outlook.com"
```

#### Scenario: Concurrent OAuth Sessions
```gherkin
Given two users are configuring Google Drive destinations simultaneously
When both initiate OAuth flows
Then each should get a unique session ID
And each should complete authorization independently
And tokens should be associated with the correct user and destination
```

#### Scenario: OAuth Error Handling
```gherkin
Given I am in the OAuth flow
When a network error occurs during token exchange
Then I should see "Authorization failed: Network error"
And I should see a "Retry" button
When I click "Retry"
Then the OAuth flow should restart
```

## Validation Rules

### OAuth Session Schema
```typescript
const oAuthSessionSchema = z.object({
  sessionId: z.string().uuid(),
  providerType: z.enum(["google-drive", "onedrive", "dropbox"]),
  userId: z.string(),
  state: z.string().min(32), // CSRF protection
  authUrl: z.string().url(),
  codeVerifier: z.string().optional(), // PKCE
  expiresAt: z.date(),
  createdAt: z.date(),
});
```

### OAuth Token Schema
```typescript
const oAuthTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default("Bearer"),
  refresh_token: z.string().min(1),
  expiry: z.date(),
  scope: z.string().optional(),
});
```

### OAuth Callback Validation
```typescript
const oAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});
```

## Data Model

### OAuth Session
```typescript
interface OAuthSession {
  sessionId: string;
  providerType: "google-drive" | "onedrive" | "dropbox";
  userId: string;
  destinationId?: string; // If editing existing destination

  // OAuth flow data
  state: string;          // CSRF token
  codeVerifier?: string;  // PKCE code verifier
  authUrl: string;        // URL for user to visit

  // Token storage (temporary, until destination saved)
  token?: OAuthToken;

  // Metadata
  expiresAt: Date;        // Session expires in 10 minutes
  createdAt: Date;
  completedAt?: Date;
}
```

### OAuth Token (stored in destination.rcloneConfig)
```typescript
interface OAuthToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expiry: Date;
  scope?: string;

  // Additional provider-specific data
  email?: string;         // Account email
  accountName?: string;   // Account display name
  accountId?: string;     // Provider's account identifier
}
```

## OAuth Provider Configurations

### Google Drive
```typescript
const googleDriveOAuthConfig = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/api/oauth/callback/google-drive`,
};
```

### OneDrive
```typescript
const oneDriveOAuthConfig = {
  authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  scopes: [
    "Files.ReadWrite.All",
    "offline_access",
    "User.Read",
  ],
  clientId: process.env.ONEDRIVE_OAUTH_CLIENT_ID,
  clientSecret: process.env.ONEDRIVE_OAUTH_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/api/oauth/callback/onedrive`,
};
```

### Dropbox
```typescript
const dropboxOAuthConfig = {
  authUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropboxapi.com/oauth2/token",
  scopes: [
    "files.content.write",
    "files.content.read",
  ],
  clientId: process.env.DROPBOX_OAUTH_CLIENT_ID,
  clientSecret: process.env.DROPBOX_OAUTH_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/api/oauth/callback/dropbox`,
};
```

## API Endpoints

### Initiate OAuth Flow
```typescript
POST /api/destinations/oauth/init
Request: {
  providerType: "google-drive" | "onedrive" | "dropbox"
  destinationId?: string // If editing existing
}
Response: {
  sessionId: string
  authUrl: string
  expiresAt: string
}
```

### OAuth Callback
```typescript
GET /api/oauth/callback/:provider
Query: {
  code: string
  state: string
  error?: string
}
Response: HTML page that closes popup and notifies parent
```

### Check OAuth Status
```typescript
GET /api/destinations/oauth/status/:sessionId
Response: {
  status: "pending" | "completed" | "expired" | "error"
  token?: OAuthToken // Only if completed
  error?: string
  accountEmail?: string
}
```

### Refresh Token
```typescript
POST /api/destinations/:id/refresh-token
Response: {
  success: boolean
  newExpiry?: string
  error?: string
}
```

### Revoke Authorization
```typescript
POST /api/destinations/:id/revoke
Response: {
  success: boolean
  revokeUrl: string // URL to provider's account settings
}
```

## Security Measures

### CSRF Protection
- Generate random state parameter (32+ characters)
- Store in session with TTL
- Validate on callback
- Reject mismatched state

### PKCE (Proof Key for Code Exchange)
- Generate code_verifier (random 43-128 chars)
- Create code_challenge (SHA256 hash of verifier)
- Send challenge in auth request
- Send verifier in token exchange
- Prevents authorization code interception

### Rate Limiting
- 5 OAuth initiations per user per hour
- 10 callback attempts per session
- 3 token refresh failures before marking stale

### Token Encryption
- Encrypt entire OAuth token JSON
- Use Dokploy's master encryption key
- Decrypt only during rclone execution
- Never send to frontend

### HTTPS Enforcement
- Require HTTPS for all OAuth callbacks in production
- Reject HTTP callbacks (except localhost for dev)

### Session Cleanup
- Auto-delete expired sessions after 10 minutes
- Clean up completed sessions after 1 hour
- Clear failed sessions after 1 hour

## UI Components

### OAuth Authorization Button
```tsx
<Button
  onClick={() => initiateOAuth("google-drive")}
  disabled={isAuthorizing}
>
  {isAuthorizing ? (
    <>
      <Spinner /> Authorizing...
    </>
  ) : (
    <>
      <GoogleIcon /> Authorize with Google
    </>
  )}
</Button>
```

### Authorization Status Display
```tsx
<div className="auth-status">
  {token ? (
    <>
      <CheckIcon className="text-green-500" />
      <span>Authorized as {token.email}</span>
      <Button variant="ghost" size="sm" onClick={revoke}>
        Revoke
      </Button>
    </>
  ) : (
    <>
      <AlertIcon className="text-yellow-500" />
      <span>Not authorized</span>
      <Button onClick={reauthorize}>
        Re-authorize
      </Button>
    </>
  )}
</div>
```

### OAuth Polling Hook
```typescript
function useOAuthStatus(sessionId: string) {
  const [status, setStatus] = useState<OAuthStatus>("pending");

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/oauth/status/${sessionId}`);
      const data = await response.json();

      setStatus(data.status);

      if (data.status !== "pending") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  return status;
}
```

## Error Handling

### OAuth Errors
- `access_denied`: User denied authorization
- `invalid_request`: Malformed OAuth request
- `unauthorized_client`: Invalid client credentials
- `invalid_grant`: Invalid/expired authorization code
- `invalid_scope`: Requested scope not allowed

### User-Friendly Messages
```typescript
const oauthErrorMessages = {
  access_denied: "Authorization was denied. Please try again and click 'Allow'.",
  invalid_request: "Configuration error. Please contact support.",
  unauthorized_client: "OAuth credentials are not configured. Contact admin.",
  invalid_grant: "Authorization expired. Please try again.",
  invalid_scope: "Insufficient permissions. Please contact support.",
  network_error: "Network error occurred. Please check your connection.",
  timeout: "Authorization timed out. Please try again.",
};
```

## Testing Requirements

### Unit Tests
- OAuth URL generation with PKCE
- State parameter validation
- Token encryption/decryption
- Token expiration detection
- Session expiration

### Integration Tests
- Full OAuth flow (mocked provider)
- Token refresh logic
- Callback validation
- Session cleanup
- Concurrent sessions

### Manual Tests
- Real OAuth with Google Drive
- Real OAuth with OneDrive
- Test popup flow in different browsers
- Test token refresh after expiration
- Test re-authorization flow
- Test revocation

## Environment Variables Required

```bash
# Google Drive
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx

# OneDrive
ONEDRIVE_OAUTH_CLIENT_ID=xxx
ONEDRIVE_OAUTH_CLIENT_SECRET=xxx

# Dropbox
DROPBOX_OAUTH_CLIENT_ID=xxx
DROPBOX_OAUTH_CLIENT_SECRET=xxx

# App settings
APP_URL=https://dokploy.example.com
OAUTH_SESSION_TTL=600 # 10 minutes
```

## Provider Setup Documentation

### Google Drive Setup
1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-dokploy.com/api/oauth/callback/google-drive`
6. Copy client ID and secret to environment variables

### OneDrive Setup
1. Go to Azure Portal
2. Register new application
3. Add Microsoft Graph permissions (Files.ReadWrite.All)
4. Create client secret
5. Add redirect URI
6. Copy application ID and secret

## Compliance & Privacy

### Data Access
- Request minimum required scopes
- Never access files outside backup folder
- Never read user's personal files
- Only write backup files

### Token Storage
- Tokens encrypted at rest
- Tokens never logged
- Tokens auto-deleted when destination deleted
- Refresh tokens rotated when possible

### User Control
- Users can revoke anytime
- Clear revocation instructions
- Transparent about data access
- No background data collection
