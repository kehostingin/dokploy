# Implementation Tasks: Multi-Provider Backup Destinations

## Phase 1: Foundation & Infrastructure ✅ COMPLETED

### 1.1 Database Schema ✅
- [x] Add migration to extend `destination` table with new columns
  - [x] `provider_type` (TEXT, default 's3')
  - [x] `rclone_config` (TEXT, encrypted)
  - [x] `custom_config` (TEXT)
  - [x] `last_tested_at` (TIMESTAMP)
  - [x] `last_error` (TEXT)
- [x] Create migration to set existing destinations to `provider_type = 's3'`
- [x] Add indexes for `provider_type` and `organizationId`
- [x] Create Drizzle schema definitions
- [x] Create Zod validation schemas for each provider type
- **Files created**: `apps/dokploy/drizzle/0122_add_multi_provider_destinations.sql`, `packages/server/src/db/schema/destination.ts` (updated)

### 1.2 Docker & rclone Setup ✅
- [x] Add rclone installation to Dockerfile (already present at line 49)
- [x] Verify rclone binary works in container
- [x] Create rclone config directory structure (will be created at runtime)
- [ ] Test rclone basic commands in container (deferred to runtime testing)
- [ ] Document rclone version requirements (deferred to documentation phase)

### 1.3 rclone Service Layer ✅
- [x] Create `packages/server/src/services/rclone/` directory structure
- [x] Implement `rclone-config.ts` - Config generation
  - [x] Function to convert JSON config to rclone.conf format
  - [x] Template for each provider type
  - [x] Environment variable substitution (placeholder for obscure/reveal)
- [x] Implement `rclone-executor.ts` - Command execution
  - [x] Execute rclone commands with proper error handling
  - [x] Parse rclone output (JSON mode when available)
  - [x] Stream progress for long-running operations
- [x] Implement `rclone-providers.ts` - Provider definitions
  - [x] Provider metadata (name, icon, OAuth support, etc.)
  - [x] Config schema for each provider
  - [x] Validation rules per provider
- [ ] Add unit tests for config generation (deferred)
- [ ] Add unit tests for provider validation (deferred)
- **Files created**: `packages/server/src/services/rclone/rclone-config.ts`, `rclone-executor.ts`, `rclone-providers.ts`, `index.ts`

### 1.4 Encryption Service ✅
- [x] Create encryption utilities for sensitive fields
- [x] Implement encrypt/decrypt for `rclone_config`
- [x] Implement encrypt/decrypt for OAuth tokens
- [x] Use AES-256-GCM encryption with scrypt key derivation
- [ ] Add tests for encryption/decryption (deferred)
- **Files created**: `packages/server/src/utils/encryption.ts`
- **Note**: Requires `DOKPLOY_ENCRYPTION_SECRET` environment variable

## Phase 2: Backend API ✅ COMPLETED

### 2.1 Destination Service Updates ✅
- [x] Update `packages/server/src/services/destination.ts`
- [x] Extend `createDestination` to support all provider types
- [x] Extend `updateDestination` to handle provider-specific config
- [x] Add `testDestinationConnection` function
  - [x] Uses `rclone lsd` to verify connectivity
  - [x] Returns success/failure with error details
  - [x] Updates `lastTestedAt` and `lastError` fields
- [x] `deleteDestination` already existed (no cleanup needed)
- [x] Implement config encryption/decryption on save/load
- [x] Add `decryptDestinationConfig` helper function
- [x] Add `getAllProviders` and `getProviderById` functions
- **Files modified**: `packages/server/src/services/destination.ts`

### 2.2 OAuth Service ✅
- [x] Create `packages/server/src/services/oauth/` directory
- [x] Implement `oauth-session.ts` - Session management
  - [x] In-memory session storage with TTL (10 minutes)
  - [x] CSRF protection with state parameter
  - [x] Session cleanup and expiration handling
- [x] Implement `oauth-google-drive.ts` - Google Drive OAuth
  - [x] Authorization URL generation
  - [x] Code exchange for access/refresh tokens
  - [x] Token refresh logic
  - [x] User info retrieval
  - [x] Configuration check
- [x] Implement `oauth-onedrive.ts` - OneDrive OAuth
  - [x] Microsoft Graph API integration
  - [x] Authorization and token exchange
  - [x] User profile retrieval
- [x] Implement `oauth-dropbox.ts` - Dropbox OAuth
  - [x] Dropbox API v2 integration
  - [x] Authorization and token management
  - [x] User account info retrieval
- **Files created**: `oauth-session.ts`, `oauth-google-drive.ts`, `oauth-onedrive.ts`, `oauth-dropbox.ts`, `index.ts`
- **Environment variables required**:
  - Google Drive: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`
  - OneDrive: `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET`
  - Dropbox: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`

### 2.3 tRPC API Routes ✅
- [x] Extended `apps/dokploy/server/api/routers/destination.ts`
- [x] `destination.all` - List all destinations with decrypted configs
- [x] `destination.create` - Create new destination with validation (already existed)
- [x] `destination.update` - Update destination (already existed)
- [x] `destination.remove` - Delete destination (already existed)
- [x] `destination.testConnection` - Test connection (updated for multi-provider)
- [x] `destination.getProviders` - List supported providers with metadata
- [x] `destination.getProviderSchema` - Get config schema for provider
- [x] Create `apps/dokploy/server/api/routers/oauth.ts`
  - [x] `oauth.initiate` - Start OAuth flow, returns auth URL and session ID
  - [x] `oauth.callback` - Handle OAuth callback, exchange code for tokens
  - [x] `oauth.getSession` - Check OAuth session status
  - [x] `oauth.getTokenData` - Get token data for creating destination
  - [x] `oauth.deleteSession` - Clean up OAuth session
  - [x] `oauth.getConfigStatus` - Check which OAuth providers are configured
- [x] Authorization checks already in place (admin only)
- [x] Input validation with Zod already in place
- **Files created**: `apps/dokploy/server/api/routers/oauth.ts`
- **Files modified**: `apps/dokploy/server/api/routers/destination.ts`, `apps/dokploy/server/api/root.ts` (added oauth router)

### 2.4 Backup Service Integration ✅
- [x] Update `packages/server/src/utils/backups/postgres.ts`
  - [x] Check destination provider type via `getRcloneUploadCommand`
  - [x] Route to rclone flags (legacy S3) or config file (new providers)
  - [x] Pipe backup directly to rclone for upload
- [x] Update `packages/server/src/utils/backups/mysql.ts` (same pattern)
- [x] Update `packages/server/src/utils/backups/mariadb.ts` (same pattern)
- [x] Update `packages/server/src/utils/backups/mongo.ts` (same pattern)
- [ ] Update `packages/server/src/services/backup/redis.ts` (if exists - not found)
- [x] Create abstracted upload functions
  - [x] `getRcloneUploadCommand(destination, path)` in utils.ts
  - [x] `uploadToDestination(file, destinationId)` in upload.ts (for file-based backups)
  - [x] `uploadToS3(file, destination)` in s3-upload.ts (legacy S3 support)
  - [x] Handles routing internally based on provider type
  - [x] Returns upload result/error
- **Files created**: `packages/server/src/services/backup/upload.ts`, `s3-upload.ts`
- **Files modified**: `packages/server/src/utils/backups/utils.ts`, `postgres.ts`, `mysql.ts`, `mariadb.ts`, `mongo.ts`

## Phase 3: Frontend UI

### 3.1 Navigation Updates ✅
- [x] Update `apps/dokploy/components/layouts/side.tsx`
- [x] Change "S3 Destinations" to "Backup Destinations"
- [x] Keep Database icon (consistent with backup storage concept)
- [x] Verify menu item permissions (admin only)
- [x] Update `apps/dokploy/pages/dashboard/settings/destinations.tsx` metaName
- [x] Update `apps/dokploy/components/dashboard/settings/destination/show-destinations.tsx` title and description
- [x] Update `apps/dokploy/components/dashboard/database/backups/show-backups.tsx` link text
- **Files updated**: 4 files with "S3 Destinations" → "Backup Destinations"

### 3.2 Destination List Page ✅
- [x] Update `apps/dokploy/pages/dashboard/settings/destinations.tsx` (metaName updated earlier)
- [x] Update `apps/dokploy/components/dashboard/settings/destination/show-destinations.tsx`
- [x] Display provider type badge/icon for each destination
- [x] Add provider-specific information in list view
- [x] Add "Test Connection" button with loading state
- [x] Show last tested timestamp with success/error indicators
- [x] Show last error if connection failed
- [ ] Add filter by provider type (deferred - not essential)
- **Files modified**: `apps/dokploy/components/dashboard/settings/destination/show-destinations.tsx`
- **Features added**:
  - Provider type badges with icons (S3, Google Drive, OneDrive, FTP, SFTP, etc.)
  - Connection status indicators (green checkmark for success, red X for errors)
  - Test Connection button with loading state
  - Last tested timestamp display
  - Error message display

### 3.3 Add Destination Dialog ✅
- [x] Created `apps/dokploy/components/dashboard/settings/destination/handle-destinations-v2.tsx`
- [x] Provider selection dropdown with icons and descriptions
  - [x] Shows provider logos/icons (Cloud, Server, etc.)
  - [x] Shows brief description per provider
  - [x] Supports S3, FTP, SFTP, Custom rclone config
- [x] Dynamic form based on selected provider
  - [x] S3: Access Key, Secret Key, Bucket, Region, Endpoint
  - [x] FTP: Host, Port, Username, Password, TLS toggle
  - [x] SFTP: Host, Port, Username, Password/SSH Key
  - [x] Custom: rclone config textarea
- [x] Save functionality with proper data mapping
  - [x] Converts form data to rcloneConfig JSON format
  - [x] Maintains backward compatibility with legacy S3 fields
- **Note**: Test connection happens after saving (via list page button)
- **Files created**: `handle-destinations-v2.tsx`
- **Files modified**: `show-destinations.tsx` (to use V2 component)

### 3.4 Provider-Specific Forms ✅ (Non-OAuth Complete)
- [x] All provider forms integrated into `handle-destinations-v2.tsx` (no separate components)
- [x] **S3 form** - S3-compatible storage configuration
  - [x] Provider selection (AWS, MinIO, DigitalOcean, etc.)
  - [x] Access Key ID, Secret Access Key
  - [x] Bucket, Region, Endpoint
- [x] **FTP form** - FTP/FTPS configuration
  - [x] Host, Port (default: 21), Username, Password
  - [x] TLS/SSL toggle
- [x] **SFTP form** - SSH File Transfer Protocol
  - [x] Host, Port (default: 22), Username
  - [x] Password OR SSH Private Key (textarea)
- [x] **WebDAV form** - WebDAV configuration
  - [x] WebDAV URL, Vendor selection (Nextcloud, ownCloud, SharePoint, Other)
  - [x] Username, Password
- [x] **Local form** - Local filesystem
  - [x] Absolute path on server
- [x] **Crypt form** - Encryption wrapper
  - [x] Base remote selection
  - [x] Encryption password fields (password, salt password)
  - [x] Filename encryption mode (standard, obfuscate, off)
- [x] **Custom form** - Custom rclone config
  - [x] Textarea for rclone config snippet
  - [x] Link to rclone documentation
- [ ] **OAuth forms (DEFERRED)** - Requires OAuth backend implementation
  - [ ] `google-drive-form.tsx` - Google Drive OAuth form
  - [ ] `onedrive-form.tsx` - OneDrive OAuth form
  - [ ] `dropbox-form.tsx` - Dropbox OAuth form
- **Note**: Implemented 7 provider types (S3, FTP, SFTP, WebDAV, Local, Crypt, Custom) in single component
- **Files modified**: `handle-destinations-v2.tsx`, `show-destinations.tsx` (icons)

### 3.5 Edit Destination Dialog ✅
- [x] Edit functionality integrated into `handle-destinations-v2.tsx` (no separate component needed)
- [x] Load existing destination data via `api.destination.one.useQuery`
- [x] Show provider-specific form (provider type is read-only/disabled when editing)
- [x] Allow updating config (e.g., password change, credentials)
- [x] Re-test connection after changes (via "Test Connection" button in list page)
- [ ] Handle OAuth token refresh if expired (deferred with OAuth implementation)
- **Note**: Edit mode determined by `destinationId` prop; form auto-populates with decrypted data
- **Files modified**: `handle-destinations-v2.tsx` (edit support built-in from Phase 3.3)

### 3.6 OAuth Flow UI ⏸️ (PARTIAL)
- [x] Add OAuth providers to PROVIDER_INFO mapping
  - [x] Google Drive: OAuth info, required fields
  - [x] OneDrive: OAuth info, required fields
  - [x] Dropbox: OAuth info, required fields
- [x] Add OAuth provider selection in dropdown
- [x] Add informational panels explaining OAuth requirements
  - [x] OAuth authentication explanation
  - [x] Environment variable requirements
  - [x] Setup instructions
- [ ] Create OAuth authorization button with popup window
- [ ] Handle OAuth callback page
  - [ ] Display "Authorizing..." message
  - [ ] Close popup and notify parent window
- [ ] Show OAuth status in main window
  - [ ] Polling for session status
  - [ ] Success message with account info
  - [ ] Error handling for OAuth failures
- [ ] Handle OAuth token expiration warnings
  - [ ] Show "Re-authorize" button if token expired
- **Status**: OAuth backend complete (Phase 2.2). Basic provider info added to UI. Full OAuth flow UI pending.
- **Files modified**: `handle-destinations-v2.tsx` (added OAuth provider info panels)

## Phase 4: Testing & Validation

### 4.1 Unit Tests ✅
- [x] Test rclone config generation for each provider
  - [x] S3 provider with all fields and optional fields
  - [x] FTP provider with TLS support
  - [x] SFTP provider with password and SSH key
  - [x] Custom provider handling
  - [x] Remote name handling with special characters
  - [x] Error handling for missing/invalid fields
- [x] Test provider validation logic
  - [x] All provider metadata validation
  - [x] OAuth vs non-OAuth categorization
  - [x] Provider schema validation
  - [x] Provider ID uniqueness
- [x] Test encryption/decryption of sensitive fields
  - [x] Basic encrypt/decrypt functionality
  - [x] JSON data encryption
  - [x] Sensitive credentials encryption
  - [x] IV randomization (different ciphertext for same plaintext)
  - [x] Special characters and unicode support
  - [x] SSH private key format
  - [x] Error handling for invalid ciphertext
  - [x] Security properties (authenticated encryption, tamper detection)
- [ ] Test OAuth session management (deferred with OAuth implementation)
- [ ] Test destination CRUD operations (integration tests)
- [ ] Test backup upload routing logic (integration tests)
- **Files created**:
  - `apps/dokploy/__test__/services/rclone/rclone-config.test.ts` (60 tests)
  - `apps/dokploy/__test__/services/rclone/rclone-providers.test.ts` (25 tests)
  - `apps/dokploy/__test__/utils/encryption.test.ts` (30+ tests)

### 4.2 Integration Tests
- [ ] Test actual rclone commands against test backends
  - [ ] Setup local Minio for S3 testing
  - [ ] Setup local SFTP server for SFTP testing
  - [ ] Mock OAuth flows for Google Drive/OneDrive
- [ ] Test backup upload to each provider type
- [ ] Test connection testing for each provider
- [ ] Test error handling and retries
- [ ] Test OAuth token refresh

### 4.3 E2E Tests
- [ ] Test complete flow: create destination → configure → test → use in backup
- [ ] Test OAuth flow from start to finish (mocked)
- [ ] Test editing destination and re-testing
- [ ] Test deleting destination
- [ ] Test switching backup destination for a service

### 4.4 Manual Testing Checklist
- [ ] Create Google Drive destination with real OAuth
- [ ] Create OneDrive destination with real OAuth
- [ ] Create SFTP destination with real server
- [ ] Create FTP destination with real server
- [ ] Create encrypted destination (crypt over Google Drive)
- [ ] Create custom destination with rclone snippet
- [ ] Trigger backups to each destination type
- [ ] Verify files uploaded correctly
- [ ] Test connection testing for each
- [ ] Test OAuth token refresh
- [ ] Test error scenarios (wrong credentials, network errors)

## Phase 5: Documentation

### 5.1 User Documentation
- [ ] Update docs for "Backup Destinations" (renamed from S3)
- [ ] Create setup guide for Google Drive
  - [ ] How to create OAuth credentials
  - [ ] Step-by-step authorization flow
- [ ] Create setup guide for OneDrive
- [ ] Create setup guide for SFTP
- [ ] Create setup guide for FTP
- [ ] Create guide for encryption (crypt remote)
- [ ] Create guide for custom rclone config
- [ ] Document limitations and gotchas per provider

### 5.2 Developer Documentation
- [ ] Document rclone service architecture
- [ ] Document OAuth flow implementation
- [ ] Document how to add new provider types
- [ ] Document testing approach
- [ ] Update API documentation with new endpoints

### 5.3 Migration Guide
- [ ] Document backward compatibility guarantees
- [ ] Explain S3 → rclone migration (if users want it)
- [ ] Document breaking changes (if any)

## Phase 6: Security & Compliance

### 6.1 Security Audit
- [ ] Review encryption implementation
- [ ] Review OAuth token storage
- [ ] Review secrets management
- [ ] Check for credential leakage in logs
- [ ] Verify HTTPS enforcement for OAuth callbacks
- [ ] Test rate limiting on OAuth endpoints

### 6.2 Compliance
- [ ] Document data handling for each provider
- [ ] Ensure GDPR compliance (if applicable)
- [ ] Document retention policies
- [ ] Add audit logging for destination changes

## Phase 7: Performance & Optimization

### 7.1 Performance Testing
- [ ] Benchmark upload speeds for each provider
- [ ] Test with large backup files (1GB+)
- [ ] Test concurrent uploads to multiple destinations
- [ ] Profile rclone memory/CPU usage

### 7.2 Optimization
- [ ] Tune rclone parameters for each provider
  - [ ] Chunk size
  - [ ] Parallel transfers
  - [ ] Buffer size
- [ ] Implement upload progress tracking
- [ ] Add retry logic with exponential backoff
- [ ] Implement background job queue for uploads

## Phase 8: Polish & Launch

### 8.1 UI/UX Polish
- [ ] Add provider logos/icons
- [ ] Improve error messages
- [ ] Add helpful tooltips and hints
- [ ] Add loading states and progress indicators
- [ ] Add success animations
- [ ] Responsive design for mobile

### 8.2 Final Testing
- [ ] Full regression testing
- [ ] Test all providers end-to-end
- [ ] Test edge cases and error scenarios
- [ ] Performance testing under load

### 8.3 Launch Preparation
- [ ] Write release notes
- [ ] Update changelog
- [ ] Create demo video or screenshots
- [ ] Plan rollout strategy (feature flag?)
- [ ] Prepare support resources

## Estimated Timeline

- **Phase 1 (Foundation)**: 1 week
- **Phase 2 (Backend API)**: 1.5 weeks
- **Phase 3 (Frontend UI)**: 2 weeks
- **Phase 4 (Testing)**: 1 week
- **Phase 5 (Documentation)**: 0.5 week
- **Phase 6 (Security)**: 0.5 week
- **Phase 7 (Performance)**: 0.5 week
- **Phase 8 (Polish)**: 1 week

**Total**: ~8 weeks (2 months) for full implementation

## Dependencies

- rclone binary (latest stable version)
- OAuth credentials for Google Drive/OneDrive (for testing)
- Test servers for SFTP/FTP
- Updated TypeScript types for new schemas

## Risk Mitigation

- Start with simplest provider (SFTP) to prove architecture
- Implement Google Drive early to validate OAuth flow
- Keep S3 legacy path as fallback
- Use feature flags to gradually roll out new providers
- Monitor error rates closely in production
