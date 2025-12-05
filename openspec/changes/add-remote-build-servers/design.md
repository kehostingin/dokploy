# Design: Remote Build Server Integration

## Context
Dokploy currently executes builds on the same server infrastructure where applications are deployed. This design introduces a pluggable remote build server system that allows organizations to offload builds to external services (Google Cloud Build, custom remote servers) while maintaining the existing local build capability.

Key constraints:
- Must support multiple build server providers (Google Cloud Build, generic remote APIs)
- Credentials must be stored securely (encrypted at rest)
- Build workflow must handle async remote builds with status tracking
- Must not break existing local build workflows
- Registry integration is required (remote builds push, Dokploy pulls)

## Goals / Non-Goals

**Goals:**
- Support Google Cloud Build as first cloud provider
- Support generic remote build servers with custom API/webhook integration
- Organization-level build server configuration (shared across applications)
- Encrypted credential storage in Dokploy database
- Remote build status tracking via webhooks or polling
- Seamless registry integration (remote build pushes, Dokploy pulls)

**Non-Goals:**
- AWS CodeBuild, Azure Pipelines support in initial implementation (future)
- Application-level build server overrides (organization level only for v1)
- Real-time build log streaming from remote servers (pull logs after completion)
- Build caching strategies beyond provider defaults
- Local build server deprecation (both paths coexist)

## Decisions

### 1. Build Server Configuration Scope
**Decision:** Organization-level configuration only in v1

**Rationale:**
- Simplifies initial implementation
- Reduces configuration overhead for users
- Most organizations use consistent build infrastructure
- Can add per-application overrides in future if needed

**Alternatives considered:**
- Per-application config: More flexible but increases complexity
- Global config only: Too restrictive for multi-tenant scenarios

### 2. Provider Architecture
**Decision:** Abstract provider interface with concrete implementations

```typescript
interface BuildServerProvider {
  triggerBuild(params: BuildParams): Promise<BuildJob>;
  getBuildStatus(jobId: string): Promise<BuildStatus>;
  getBuildLogs(jobId: string): Promise<string>;
  cancelBuild(jobId: string): Promise<void>;
}
```

**Rationale:**
- Enables adding new providers without modifying core logic
- Testable via mocks
- Clear separation of concerns

### 3. Credential Storage
**Decision:** Encrypt credentials in database using existing encryption utilities

**Rationale:**
- Dokploy already stores encrypted secrets (SSH keys, registry passwords)
- Keeps credentials within Dokploy's security boundary
- No external dependencies for secret management
- User has full control over credential lifecycle

**Alternatives considered:**
- Environment variables: Harder to manage per-organization
- External secret managers: Adds complexity and external dependencies

### 4. Build Image Flow
**Decision:** Remote builds must push to a registry; Dokploy pulls from registry for deployment

**Rationale:**
- Decouples build and deployment infrastructure
- Registry is source of truth for images
- Supports existing registry integration patterns
- Enables future optimizations (multi-region deployments)

**Alternatives considered:**
- Direct image transfer: Complex networking, doesn't scale

### 5. Build Status Tracking
**Decision:** Support both webhooks (preferred) and polling (fallback)

**Rationale:**
- Webhooks provide real-time updates for supported providers
- Polling ensures compatibility with providers without webhook support
- User can configure preferred method based on network topology

### 6. Schema Design
**Decision:** New `build_server` table with provider-specific config as JSONB

```sql
CREATE TABLE build_server (
  build_server_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id),
  name TEXT NOT NULL,
  description TEXT,
  provider_type TEXT NOT NULL, -- 'google-cloud-build', 'generic-remote'
  provider_config JSONB NOT NULL, -- encrypted, provider-specific fields
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Rationale:**
- JSONB allows provider-specific configuration without schema changes
- Encryption handled at application layer before storage
- Enables multiple build servers per organization (e.g., dev/prod)

## Risks / Trade-offs

### Risk: Remote build failures harder to debug
**Mitigation:**
- Store build job IDs in deployment records
- Fetch and store remote logs after build completion
- Provide clear error messages with links to provider console

### Risk: Network latency for build coordination
**Mitigation:**
- Async build workflow with status polling
- Webhooks for real-time updates when available
- Timeout configuration per build server

### Risk: Registry authentication complexity
**Mitigation:**
- Reuse existing registry authentication patterns
- Validate registry config during build server setup
- Clear documentation for provider-specific registry integration

### Trade-off: Organization-level only
**Implication:** All applications in org share same build server
**Mitigation:** Can be extended to app-level in future; most orgs have consistent infra

## Migration Plan

**Phase 1: Schema & Core Infrastructure**
1. Add `build_server` table via Drizzle migration
2. Add `buildServerId` nullable FK to `application` table
3. Implement encryption/decryption utilities for provider credentials
4. Create build server CRUD service layer

**Phase 2: Provider Implementation**
1. Define `BuildServerProvider` interface
2. Implement Google Cloud Build provider
3. Implement Generic Remote provider (webhook-based)
4. Add provider factory/registry

**Phase 3: Build Orchestration**
1. Modify `deployApplication` to detect remote build server
2. Implement remote build trigger logic
3. Implement status polling with timeout
4. Integrate webhook receiver for build status updates
5. Update deployment state machine for remote builds

**Phase 4: UI & Documentation**
1. Build server management UI (org settings)
2. Application build server selection UI
3. Build status indicators for remote builds
4. Documentation for provider setup

**Rollback:**
- Migrations are additive (new tables/columns); can be rolled back
- Feature flag: `ENABLE_REMOTE_BUILD_SERVERS` to toggle functionality
- Applications without `buildServerId` continue using local builds

## Open Questions

1. **Build timeout defaults:** What timeout should we use for remote builds? (Proposal: 30 minutes default, configurable per build server)
2. **Build concurrency limits:** Should we limit concurrent remote builds per org? (Proposal: No limits in v1, rely on provider limits)
3. **Cost visibility:** Should we track/display estimated build costs? (Proposal: Out of scope for v1, providers show this in their console)
4. **Build artifact cleanup:** Who manages old images in registry after remote builds? (Proposal: Existing registry cleanup policies apply, no special handling)
