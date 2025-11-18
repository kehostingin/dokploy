# Add Multi-Provider Backup Destinations

**Status:** Draft
**Created:** 2025-01-18
**Author:** AI Assistant
**Priority:** High

---

## Problem Statement

Currently, Dokploy only supports S3-compatible storage for backup destinations. This limitation restricts users who:

- Prefer alternative cloud storage providers (Google Drive, OneDrive, Dropbox)
- Want to use their own FTP/SFTP servers for backups
- Need encrypted backups with end-to-end encryption (E2EE)
- Have specific compliance requirements for data storage location
- Want to minimize costs by using free tier offerings from various providers
- Need multiple backup strategies for redundancy

The current S3-only approach forces users to either:
1. Use S3-compatible services even if they're not their preferred option
2. Manually copy backups to their preferred storage after creation
3. Skip backups entirely if S3 is not suitable for their use case

## Proposed Solution

Integrate **rclone** as the universal backup backend to support multiple storage providers while maintaining backward compatibility with existing S3 destinations.

### What is rclone?

rclone is a mature, battle-tested command-line program that syncs files and directories to and from 70+ cloud storage providers. It's often called "rsync for cloud storage" and is:

- **Well-established**: 10+ years of active development, 45k+ GitHub stars
- **Comprehensive**: Supports 70+ providers including all major cloud services
- **Secure**: Built-in encryption support via crypt remote
- **Efficient**: Supports chunked uploads, resume, deduplication
- **Open Source**: MIT licensed, actively maintained

### Key Features

1. **Multi-Provider Support**:
   - **Google Drive** (highest priority)
   - **OneDrive** (Microsoft 365)
   - **FTP/FTPS**
   - **SFTP** (SSH File Transfer Protocol)
   - **Dropbox**
   - **S3-compatible** (existing, via rclone too)
   - **Custom rclone config** (for any other provider)

2. **End-to-End Encryption**:
   - Support rclone's `crypt` remote type
   - Encrypts files, filenames, and directory structure
   - User-controlled encryption keys
   - Works with any underlying storage provider

3. **Custom Configuration**:
   - Allow advanced users to paste rclone config snippets
   - Enables use of any rclone-supported backend
   - Supports advanced options like bandwidth limits, filtering, etc.

4. **Backward Compatibility**:
   - Existing S3 destinations continue to work unchanged
   - Option to migrate S3 destinations to rclone-based approach
   - No breaking changes to existing backup flows

### User Experience

#### Menu Rename
- **Before**: "S3 Destinations" in Settings menu
- **After**: "Backup Destinations" in Settings menu

#### Provider Selection Flow
1. User clicks "Add Destination"
2. Selects provider type from dropdown (Google Drive, OneDrive, FTP, SFTP, S3, Custom)
3. Provider-specific configuration form appears
4. User fills in credentials/settings
5. "Test Connection" validates configuration
6. Destination saved and available for backups

#### Configuration Examples

**Google Drive:**
- OAuth2 flow for authorization
- Optional: Service account for automation
- Optional: Shared drive support
- Optional: Root folder path

**SFTP:**
- Host, Port
- Username, Password/SSH Key
- Optional: Known hosts verification
- Optional: Base path

**FTP:**
- Host, Port
- Username, Password
- TLS/SSL options
- Passive/Active mode

**Crypt (Encryption):**
- Base remote (any other destination)
- Encryption password
- Salt password
- Encryption mode (standard/obfuscation)

## Impact Analysis

### Affected Components

**Backend:**
- Database schema (destinations table)
- rclone service integration
- Backup services (postgres, mysql, mariadb, mongo, redis, application)
- Destination management API

**Frontend:**
- Settings navigation menu
- Destination list/management UI
- Provider-specific configuration forms
- OAuth callback handling (Google Drive, OneDrive)

**Infrastructure:**
- Docker container with rclone installed
- OAuth callback route configuration
- Secrets management for encryption keys

### Benefits

1. **User Flexibility**: Support for 70+ storage providers
2. **Cost Optimization**: Use free tiers from multiple providers
3. **Security**: Built-in E2EE support via crypt
4. **Reliability**: Battle-tested rclone for cloud sync
5. **Compliance**: Store data in specific regions/providers
6. **Redundancy**: Multiple backup destinations possible

### Risks & Mitigations

**Risk 1: OAuth Complexity**
- Google Drive and OneDrive require OAuth2 flows
- **Mitigation**: Use rclone's built-in OAuth support, provide clear setup guides

**Risk 2: rclone Learning Curve**
- rclone has many options and configurations
- **Mitigation**: Provide sensible defaults, hide complexity behind UI

**Risk 3: Secrets Management**
- rclone config contains sensitive credentials
- **Mitigation**: Encrypt rclone config at rest, use environment variables for passwords

**Risk 4: Performance**
- Large backups may be slower than direct S3 SDK
- **Mitigation**: Use rclone's advanced options (chunking, parallelism), background jobs

**Risk 5: OAuth Token Refresh**
- OAuth tokens expire and need refreshing
- **Mitigation**: Store refresh tokens, implement automatic renewal

## Technical Approach

### Database Schema Changes

Extend `destination` table to support multiple provider types:

```typescript
providerType: "s3" | "google-drive" | "onedrive" | "ftp" | "sftp" | "dropbox" | "crypt" | "custom"
rcloneConfig: string (encrypted JSON containing provider-specific config)
encryptionEnabled: boolean
encryptionPassword: string (encrypted, optional)
customConfig: string (for custom rclone snippet, optional)
```

### rclone Integration

Create service layer for rclone operations:
- Generate rclone config from database settings
- Execute rclone commands (copy, sync, check, cleanup)
- Parse rclone output for progress/errors
- Handle OAuth flows and token refresh

### Backup Flow

```
1. Backup triggered → 2. Create backup file → 3. Check destination type
   ↓ S3 (legacy)                              ↓ rclone-based
   Use existing S3 SDK                        Use rclone service
   ↓                                          ↓
4. Upload to destination ← ← ← ← ← ← ← ← ← ← 4. rclone copy
   ↓                                          ↓
5. Verify upload                              5. Verify upload
   ↓                                          ↓
6. Clean up local file ← ← ← ← ← ← ← ← ← ← ← 6. Clean up local file
```

### Migration Strategy

**For Existing S3 Destinations:**
- Option 1: Keep using S3 SDK (no migration needed)
- Option 2: Migrate to rclone-based S3 (for consistency)
- Both options remain supported indefinitely

**For New Features:**
- All new providers use rclone exclusively
- New features (encryption, bandwidth limits) only via rclone

## Success Criteria

1. ✅ Users can add Google Drive as backup destination with OAuth flow
2. ✅ Users can add OneDrive as backup destination with OAuth flow
3. ✅ Users can add FTP/SFTP destinations with username/password
4. ✅ Users can enable encryption on any destination via crypt
5. ✅ Users can paste custom rclone config for advanced use cases
6. ✅ Existing S3 destinations continue working without changes
7. ✅ Backups successfully upload to all configured destination types
8. ✅ Connection testing works for all provider types
9. ✅ OAuth tokens auto-refresh before expiration
10. ✅ Menu renamed from "S3 Destinations" to "Backup Destinations"

## Open Questions

1. Should we support multiple destinations per backup (parallel uploads)?
2. How to handle rclone installation in Docker container?
3. Should we expose bandwidth limiting controls to users?
4. How to handle OAuth callbacks in containerized environment?
5. Should encryption be per-destination or per-backup?
6. What's the retention policy for OAuth tokens?
7. Should we validate rclone config before saving?

## References

- [rclone Documentation](https://rclone.org/docs/)
- [rclone Supported Providers](https://rclone.org/#providers)
- [rclone Crypt](https://rclone.org/crypt/)
- [Google Drive OAuth Setup](https://rclone.org/drive/)
- [OneDrive OAuth Setup](https://rclone.org/onedrive/)
