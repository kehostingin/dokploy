# Technical Design: Multi-Provider Backup Destinations

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Provider     │  │ Destination  │  │ OAuth        │          │
│  │ Selection    │  │ Config Form  │  │ Callback     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │ tRPC API
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (tRPC + Services)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Destination Service                                       │   │
│  │  - CRUD operations                                        │   │
│  │  - Validation                                             │   │
│  │  - Connection testing                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ rclone Service                                            │   │
│  │  - Config generation                                      │   │
│  │  - Command execution                                      │   │
│  │  - OAuth flow management                                  │   │
│  │  - Progress tracking                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Backup Services (postgres, mysql, mongo, redis, etc.)    │   │
│  │  - Generate backup file                                   │   │
│  │  - Route to appropriate upload service                    │   │
│  │  - Clean up temporary files                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────────┐
│                          Storage Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ PostgreSQL│  │ rclone   │  │ S3       │  │ Cloud    │        │
│  │ (metadata)│  │ (binary) │  │ (legacy) │  │ Providers│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Technical Decisions

### Decision 1: Provider Type Enum

**Options Considered:**
1. Fixed enum in database
2. Dynamic provider types from config
3. Two-tier: base types + custom

**Decision:** Fixed enum with "custom" escape hatch

**Rationale:**
- Type safety in TypeScript/SQL
- Known providers get first-class UI support
- Custom type allows any rclone provider
- Easier to validate and test

**Provider Types:**
```typescript
type ProviderType =
  | "s3"           // S3-compatible (backward compat)
  | "google-drive" // Google Drive via OAuth
  | "onedrive"     // OneDrive via OAuth
  | "dropbox"      // Dropbox via OAuth
  | "ftp"          // FTP/FTPS
  | "sftp"         // SSH File Transfer Protocol
  | "webdav"       // WebDAV (Nextcloud, ownCloud)
  | "local"        // Local filesystem (for testing/NAS)
  | "crypt"        // Encryption wrapper
  | "custom";      // Custom rclone config snippet
```

### Decision 2: rclone Config Storage

**Options Considered:**
1. Store as JSON in database (encrypted)
2. Store as rclone.conf format in database
3. Store in filesystem, reference in database
4. Generate dynamically from database fields

**Decision:** Store as encrypted JSON, generate rclone.conf on-the-fly

**Rationale:**
- JSON is easier to work with in TypeScript
- Encryption at rest for credentials
- No filesystem dependencies
- Type-safe with Zod schemas
- Can validate before saving

**Schema:**
```typescript
{
  destinationId: string;
  name: string;
  providerType: ProviderType;

  // Provider-specific config (encrypted)
  config: {
    // Google Drive
    client_id?: string;
    client_secret?: string;
    token?: string; // OAuth token JSON
    root_folder_id?: string;

    // SFTP
    host?: string;
    user?: string;
    password?: string; // or key_file
    port?: number;

    // FTP
    host?: string;
    user?: string;
    pass?: string;
    port?: number;
    tls?: boolean;

    // S3 (backward compat)
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    region?: string;
    endpoint?: string;

    // Crypt
    remote?: string; // base remote name
    password?: string;
    password2?: string; // salt
  };

  // Optional: custom rclone snippet
  customConfig?: string;

  // Metadata
  isActive: boolean;
  lastTestedAt?: string;
  lastUsedAt?: string;
}
```

### Decision 3: OAuth Flow Implementation

**Options Considered:**
1. Use rclone's built-in OAuth (`rclone authorize`)
2. Implement OAuth flow in Node.js
3. Hybrid: initiate in UI, complete via rclone

**Decision:** Hybrid approach with rclone OAuth

**Flow:**
```
1. User clicks "Add Google Drive"
   ↓
2. Frontend: Initiate OAuth
   POST /api/destinations/oauth/init
   { providerType: "google-drive" }
   ↓
3. Backend: Generate OAuth URL via rclone
   Execute: rclone authorize "drive" --auth-no-open-browser
   Returns: OAuth URL + unique session ID
   ↓
4. Frontend: Open OAuth URL in popup
   ↓
5. User: Authorizes in Google
   ↓
6. Google: Redirects to callback URL
   GET /api/destinations/oauth/callback?code=...&state=sessionId
   ↓
7. Backend: Exchange code for token via rclone
   Stores token in session
   ↓
8. Frontend: Polls for completion
   GET /api/destinations/oauth/status/:sessionId
   ↓
9. Backend: Returns token when ready
   ↓
10. Frontend: Submits destination with token
    POST /api/destinations
    { providerType, config: { token: "..." } }
```

**Rationale:**
- Leverages rclone's OAuth handling
- Avoids reimplementing OAuth in Node.js
- Secure: tokens never exposed to frontend
- Works in Docker environment

### Decision 4: Encryption Support

**Options Considered:**
1. Encrypt at application level before upload
2. Use rclone crypt as a separate destination
3. Add encryption flag to each destination
4. Both 2 and 3

**Decision:** Support crypt as separate destination type (option 2)

**Rationale:**
- More flexible: encrypt any existing destination
- Follows rclone's design pattern
- Can chain multiple crypts for layers
- Clear separation of concerns

**Usage:**
```
1. User creates base destination (e.g., Google Drive)
2. User creates crypt destination:
   - Remote: points to base destination
   - Password: encryption key
   - Password2: salt
3. User selects crypt destination for backups
   ↓
   Backup → Encrypt (via crypt) → Upload (via base remote)
```

### Decision 5: rclone Installation

**Options Considered:**
1. Install in main Dokploy image
2. Separate sidecar container
3. Download on-demand
4. Use Docker-in-Docker

**Decision:** Install in main Dokploy image

**Dockerfile Addition:**
```dockerfile
# Install rclone
RUN curl https://rclone.org/install.sh | bash

# Verify installation
RUN rclone version
```

**Rationale:**
- Simplest deployment model
- No container orchestration complexity
- rclone binary is small (~50MB)
- Single container to manage

### Decision 6: Backward Compatibility

**Approach:**
- Keep existing `destination` table structure
- Add new fields with nullable/default values
- Existing S3 destinations get `providerType: "s3"` automatically
- S3 SDK path still works for legacy destinations
- New S3 destinations can use rclone or SDK (user choice)

**Migration:**
```sql
ALTER TABLE destination ADD COLUMN provider_type TEXT DEFAULT 's3';
ALTER TABLE destination ADD COLUMN rclone_config TEXT;
ALTER TABLE destination ADD COLUMN custom_config TEXT;

UPDATE destination SET provider_type = 's3' WHERE provider_type IS NULL;
```

### Decision 7: Error Handling

**rclone Error Codes:**
- Exit 0: Success
- Exit 1: Syntax or usage error
- Exit 2: Error not otherwise categorized
- Exit 3: Directory not found
- Exit 4: File not found
- Exit 5: Temporary error (retry)
- Exit 6: Less serious errors
- Exit 7: Fatal error
- Exit 8: Transfer exceeded
- Exit 9: Operation forbidden

**Strategy:**
- Parse exit codes and provide user-friendly messages
- Retry on exit 5 (temporary errors)
- Log full rclone output for debugging
- Store last error in destination metadata

### Decision 8: Performance Optimization

**Techniques:**
1. **Chunked Uploads:**
   ```bash
   rclone copy --transfers=4 --checkers=8 --buffer-size=64M
   ```

2. **Resume Support:**
   ```bash
   rclone copy --progress --stats=1s
   ```

3. **Background Jobs:**
   - Use Bull queue for async uploads
   - Don't block backup creation

4. **Cleanup:**
   ```bash
   rclone delete remote:old-backups --min-age 30d
   ```

### Decision 9: Testing Strategy

**Unit Tests:**
- Config generation from JSON to rclone.conf
- Provider-specific validation logic
- OAuth token handling

**Integration Tests:**
- rclone command execution
- Actual uploads to test backends (minio, local)
- Error handling and retries

**E2E Tests:**
- Full OAuth flow (mocked)
- Backup creation and upload
- Connection testing

### Decision 10: Security Measures

1. **Encryption at Rest:**
   - Use Dokploy's existing encryption for sensitive fields
   - Encrypt rclone_config column
   - Encrypt OAuth tokens

2. **Secrets Management:**
   - Never log credentials
   - Use environment variables for rclone
   - Secure OAuth callback endpoint

3. **Access Control:**
   - Only admin users can manage destinations
   - Audit log for destination changes
   - Rate limit OAuth endpoints

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema changes
- rclone installation in Docker
- Basic rclone service (config generation, execution)
- Update menu from "S3 Destinations" to "Backup Destinations"

### Phase 2: Provider Support (Week 2)
- SFTP provider (simplest, no OAuth)
- FTP provider
- Google Drive OAuth flow
- Provider selection UI

### Phase 3: Advanced Features (Week 3)
- OneDrive OAuth flow
- Crypt remote support
- Custom config snippet support
- Connection testing

### Phase 4: Integration (Week 4)
- Update all backup services to support rclone
- Parallel upload support (optional)
- Progress tracking UI
- Error handling and retries

### Phase 5: Polish (Week 5)
- Documentation
- Migration guide for S3 users
- Performance optimization
- Comprehensive testing

## Configuration Examples

### Google Drive (OAuth)
```json
{
  "type": "drive",
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "xxx",
  "token": "{\"access_token\":\"xxx\",\"token_type\":\"Bearer\",\"refresh_token\":\"xxx\",\"expiry\":\"2024-01-01T00:00:00Z\"}",
  "root_folder_id": "0AGxxxxx",
  "team_drive": ""
}
```

### SFTP
```json
{
  "type": "sftp",
  "host": "backup.example.com",
  "user": "backupuser",
  "port": 22,
  "password": "encrypted_password",
  "key_file": "",
  "use_insecure_cipher": false,
  "disable_hashcheck": false
}
```

### FTP
```json
{
  "type": "ftp",
  "host": "ftp.example.com",
  "user": "ftpuser",
  "port": 21,
  "pass": "encrypted_password",
  "tls": true,
  "explicit_tls": true
}
```

### Crypt (over Google Drive)
```json
{
  "type": "crypt",
  "remote": "gdrive:backups",
  "password": "encrypted_master_key",
  "password2": "encrypted_salt",
  "filename_encryption": "standard",
  "directory_name_encryption": true
}
```

### Custom (any rclone provider)
```
[custom_backend]
type = azureblob
account = myaccount
key = mykey
```

## API Endpoints

### Destination Management
- `GET /api/destinations` - List all destinations
- `POST /api/destinations` - Create destination
- `GET /api/destinations/:id` - Get destination details
- `PATCH /api/destinations/:id` - Update destination
- `DELETE /api/destinations/:id` - Delete destination
- `POST /api/destinations/:id/test` - Test connection

### OAuth Flow
- `POST /api/destinations/oauth/init` - Start OAuth flow
- `GET /api/destinations/oauth/callback` - OAuth callback
- `GET /api/destinations/oauth/status/:sessionId` - Check OAuth status
- `POST /api/destinations/oauth/refresh/:id` - Refresh OAuth token

### Provider Info
- `GET /api/destinations/providers` - List supported providers
- `GET /api/destinations/providers/:type/schema` - Get config schema for provider

## Database Schema

```sql
CREATE TABLE destination (
  destination_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 's3',

  -- rclone config (encrypted JSON)
  rclone_config TEXT,

  -- Custom rclone snippet (for advanced users)
  custom_config TEXT,

  -- Legacy S3 fields (for backward compat)
  access_key_id TEXT,
  secret_access_key TEXT,
  bucket TEXT,
  region TEXT,
  endpoint TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  last_used_at TIMESTAMP,
  last_error TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_destination_provider ON destination(provider_type);
CREATE INDEX idx_destination_active ON destination(is_active);
```

## Monitoring & Observability

1. **Metrics to Track:**
   - Upload success/failure rate per provider
   - Upload duration per provider
   - OAuth token refresh frequency
   - Destination connection test results

2. **Logging:**
   - All rclone command executions
   - OAuth flow steps
   - Upload progress (size, speed, ETA)
   - Errors with full stack traces

3. **Alerting:**
   - OAuth token expiring soon
   - Repeated upload failures
   - Destination unreachable
   - Quota exceeded (for cloud providers)

## Future Enhancements

1. **Bandwidth Management:**
   - Upload/download speed limits
   - Scheduled backups during off-peak hours

2. **Multi-Destination Backup:**
   - Upload same backup to multiple destinations
   - Parallel or sequential strategy

3. **Backup Verification:**
   - Checksums and integrity validation
   - Periodic restore tests

4. **Smart Retention:**
   - Per-destination retention policies
   - Automated cleanup of old backups

5. **Provider Quotas:**
   - Track storage usage per provider
   - Warn when nearing quota limits
