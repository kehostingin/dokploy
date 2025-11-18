# Implementation Tasks: Multi-Provider Backup Destinations

## Phase 1: Foundation & Infrastructure

### 1.1 Database Schema
- [ ] Add migration to extend `destination` table with new columns
  - [ ] `provider_type` (TEXT, default 's3')
  - [ ] `rclone_config` (TEXT, encrypted)
  - [ ] `custom_config` (TEXT)
  - [ ] `last_tested_at` (TIMESTAMP)
  - [ ] `last_error` (TEXT)
- [ ] Create migration to set existing destinations to `provider_type = 's3'`
- [ ] Add indexes for `provider_type` and `is_active`
- [ ] Create Drizzle schema definitions
- [ ] Create Zod validation schemas for each provider type

### 1.2 Docker & rclone Setup
- [ ] Add rclone installation to Dockerfile
- [ ] Verify rclone binary works in container
- [ ] Create rclone config directory structure
- [ ] Test rclone basic commands in container
- [ ] Document rclone version requirements

### 1.3 rclone Service Layer
- [ ] Create `packages/server/src/services/rclone/` directory structure
- [ ] Implement `rclone-config.ts` - Config generation
  - [ ] Function to convert JSON config to rclone.conf format
  - [ ] Template for each provider type
  - [ ] Environment variable substitution
- [ ] Implement `rclone-executor.ts` - Command execution
  - [ ] Execute rclone commands with proper error handling
  - [ ] Parse rclone output (JSON mode when available)
  - [ ] Stream progress for long-running operations
- [ ] Implement `rclone-providers.ts` - Provider definitions
  - [ ] Provider metadata (name, icon, OAuth support, etc.)
  - [ ] Config schema for each provider
  - [ ] Validation rules per provider
- [ ] Add unit tests for config generation
- [ ] Add unit tests for provider validation

### 1.4 Encryption Service
- [ ] Create encryption utilities for sensitive fields
- [ ] Implement encrypt/decrypt for `rclone_config`
- [ ] Implement encrypt/decrypt for OAuth tokens
- [ ] Use existing Dokploy encryption key/mechanism
- [ ] Add tests for encryption/decryption

## Phase 2: Backend API

### 2.1 Destination Service Updates
- [ ] Update `packages/server/src/services/destination.ts`
- [ ] Extend `createDestination` to support all provider types
- [ ] Extend `updateDestination` to handle provider-specific config
- [ ] Add `testDestinationConnection` function
  - [ ] Uses `rclone lsd` or similar to verify connectivity
  - [ ] Returns success/failure with error details
- [ ] Add `deleteDestination` with cleanup logic
- [ ] Implement config encryption/decryption on save/load

### 2.2 OAuth Service
- [ ] Create `packages/server/src/services/oauth/` directory
- [ ] Implement `oauth-session.ts` - Session management
  - [ ] Create/retrieve OAuth sessions
  - [ ] Store session in Redis or in-memory (with TTL)
- [ ] Implement `oauth-google-drive.ts` - Google Drive OAuth
  - [ ] Initiate OAuth flow via rclone
  - [ ] Handle callback and token exchange
  - [ ] Store refresh token
  - [ ] Implement token refresh logic
- [ ] Implement `oauth-onedrive.ts` - OneDrive OAuth
  - [ ] Similar to Google Drive
- [ ] Implement `oauth-dropbox.ts` - Dropbox OAuth (optional)
- [ ] Add tests for OAuth flows (mocked)

### 2.3 tRPC API Routes
- [ ] Create `apps/dokploy/server/api/routers/destination.ts` (or extend existing)
- [ ] `destination.list` - List all destinations with decrypted configs
- [ ] `destination.create` - Create new destination with validation
- [ ] `destination.update` - Update destination
- [ ] `destination.delete` - Delete destination
- [ ] `destination.test` - Test connection
- [ ] `destination.getProviders` - List supported providers with metadata
- [ ] `destination.getProviderSchema` - Get config schema for provider
- [ ] Create `apps/dokploy/server/api/routers/oauth.ts`
- [ ] `oauth.initiate` - Start OAuth flow
- [ ] `oauth.callback` - Handle OAuth callback (HTTP endpoint)
- [ ] `oauth.status` - Check OAuth session status
- [ ] `oauth.refreshToken` - Manually refresh OAuth token
- [ ] Add authorization checks (admin only)
- [ ] Add input validation with Zod

### 2.4 Backup Service Integration
- [ ] Update `packages/server/src/services/backup/postgres.ts`
  - [ ] Check destination provider type
  - [ ] Route to rclone or S3 SDK based on type
  - [ ] Pass backup file to rclone for upload
- [ ] Update `packages/server/src/services/backup/mysql.ts` (same pattern)
- [ ] Update `packages/server/src/services/backup/mariadb.ts` (same pattern)
- [ ] Update `packages/server/src/services/backup/mongo.ts` (same pattern)
- [ ] Update `packages/server/src/services/backup/redis.ts` (same pattern)
- [ ] Create abstracted upload function
  - [ ] `uploadToDestination(file, destinationId)`
  - [ ] Handles routing internally
  - [ ] Returns upload result/error

## Phase 3: Frontend UI

### 3.1 Navigation Updates
- [ ] Update `apps/dokploy/components/layouts/side.tsx`
- [ ] Change "S3 Destinations" to "Backup Destinations"
- [ ] Update icon if needed (keep Database or change to Cloud)
- [ ] Verify menu item permissions (admin only)

### 3.2 Destination List Page
- [ ] Update `apps/dokploy/pages/dashboard/settings/destinations.tsx`
- [ ] Update `apps/dokploy/components/dashboard/settings/destination/show-destinations.tsx`
- [ ] Display provider type badge/icon for each destination
- [ ] Add provider-specific information in list view
- [ ] Add "Test Connection" button with loading state
- [ ] Show last tested timestamp
- [ ] Show last error if connection failed
- [ ] Add filter by provider type (optional)

### 3.3 Add Destination Dialog
- [ ] Create `apps/dokploy/components/dashboard/settings/destination/add-destination.tsx`
- [ ] Step 1: Provider selection
  - [ ] Dropdown or grid of provider cards
  - [ ] Show provider logos/icons
  - [ ] Show brief description per provider
- [ ] Step 2: Provider-specific configuration form
  - [ ] Dynamic form based on selected provider
  - [ ] Different fields for each provider type
- [ ] Step 3: Test and save
  - [ ] Test connection before saving
  - [ ] Show success/error feedback
  - [ ] Save button enabled only after successful test (or allow override)

### 3.4 Provider-Specific Forms
- [ ] Create `apps/dokploy/components/dashboard/settings/destination/providers/` directory
- [ ] `google-drive-form.tsx` - Google Drive OAuth form
  - [ ] "Authorize with Google" button
  - [ ] OAuth popup/redirect flow
  - [ ] Display authorized account info
  - [ ] Optional: root folder selection
- [ ] `onedrive-form.tsx` - OneDrive OAuth form
  - [ ] Similar to Google Drive
- [ ] `sftp-form.tsx` - SFTP configuration
  - [ ] Host, port, username
  - [ ] Password or SSH key upload
  - [ ] Test connection button
- [ ] `ftp-form.tsx` - FTP configuration
  - [ ] Host, port, username, password
  - [ ] TLS/SSL toggle
  - [ ] Passive mode toggle
- [ ] `s3-form.tsx` - S3 configuration (existing, maybe refactor)
- [ ] `crypt-form.tsx` - Encryption configuration
  - [ ] Select base remote from existing destinations
  - [ ] Password fields with strength indicator
  - [ ] Warning about password loss
- [ ] `custom-form.tsx` - Custom rclone config
  - [ ] Textarea for rclone config snippet
  - [ ] Syntax highlighting (optional)
  - [ ] Validation before save

### 3.5 Edit Destination Dialog
- [ ] Create `apps/dokploy/components/dashboard/settings/destination/edit-destination.tsx`
- [ ] Load existing destination data
- [ ] Show provider-specific form (read-only provider type)
- [ ] Allow updating config (e.g., password change)
- [ ] Re-test connection after changes
- [ ] Handle OAuth token refresh if expired

### 3.6 OAuth Flow UI
- [ ] Create OAuth popup/redirect flow
- [ ] Handle OAuth callback page
  - [ ] Display "Authorizing..." message
  - [ ] Close popup and notify parent window
- [ ] Show OAuth status in main window
  - [ ] Polling for session status
  - [ ] Success message with account info
  - [ ] Error handling for OAuth failures
- [ ] Handle OAuth token expiration warnings
  - [ ] Show "Re-authorize" button if token expired

## Phase 4: Testing & Validation

### 4.1 Unit Tests
- [ ] Test rclone config generation for each provider
- [ ] Test provider validation logic
- [ ] Test encryption/decryption of sensitive fields
- [ ] Test OAuth session management
- [ ] Test destination CRUD operations
- [ ] Test backup upload routing logic

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
