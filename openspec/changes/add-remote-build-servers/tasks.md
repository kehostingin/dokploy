# Implementation Tasks: Remote Build Server Support

## 1. Database Schema & Migrations
- [ ] 1.1 Create `build_server` table schema in `packages/server/src/db/schema/build-server.ts`
  - Fields: buildServerId, organizationId, name, description, providerType, providerConfig (JSONB), enabled, createdAt
  - Define pgEnum for providerType: `google-cloud-build`, `generic-remote`
  - Add Zod schemas for API validation (apiCreateBuildServer, apiUpdateBuildServer)
- [ ] 1.2 Add `buildServerId` nullable foreign key to `application` table in `packages/server/src/db/schema/application.ts`
- [ ] 1.3 Add `remoteBuildJobId` nullable field to `deployment` table in `packages/server/src/db/schema/deployment.ts`
- [ ] 1.4 Define relations in `packages/server/src/db/schema/index.ts`
- [ ] 1.5 Generate Drizzle migration with `pnpm db:generate`
- [ ] 1.6 Test migration with `pnpm db:migrate`

## 2. Core Services & Business Logic
- [ ] 2.1 Create build server service at `packages/server/src/services/build-server.ts`
  - Implement createBuildServer, findBuildServerById, findBuildServersByOrganization
  - Implement updateBuildServer, deleteBuildServer, testBuildServerConnection
- [ ] 2.2 Create credential encryption utilities at `packages/server/src/utils/encryption/build-server-credentials.ts`
  - encryptProviderConfig, decryptProviderConfig using existing encryption patterns
- [ ] 2.3 Create build server provider interface at `packages/server/src/utils/build-servers/provider.ts`
  - Define BuildServerProvider interface with triggerBuild, getBuildStatus, getBuildLogs, cancelBuild
  - Define BuildParams, BuildJob, BuildStatus types
- [ ] 2.4 Implement Google Cloud Build provider at `packages/server/src/utils/build-servers/google-cloud-build.ts`
  - Use @google-cloud/cloudbuild SDK
  - Implement all BuildServerProvider methods
  - Handle authentication with service account JSON
  - Translate Dokploy build config to Cloud Build format
- [ ] 2.5 Implement generic remote provider at `packages/server/src/utils/build-servers/generic-remote.ts`
  - HTTP client for custom API endpoints
  - Configurable request/response formats
  - Webhook secret validation
- [ ] 2.6 Create provider factory at `packages/server/src/utils/build-servers/index.ts`
  - getBuildServerProvider(buildServer: BuildServer): BuildServerProvider

## 3. Deployment Workflow Integration
- [ ] 3.1 Modify `deployApplication` in `packages/server/src/services/application.ts`
  - Check if application.buildServerId is set
  - If set, delegate to new `deployApplicationWithRemoteBuild` function
  - If not set, use existing local build flow
- [ ] 3.2 Create `deployApplicationWithRemoteBuild` function in `packages/server/src/services/application.ts`
  - Validate build server is enabled
  - Validate registry is configured
  - Trigger remote build via provider
  - Store remoteBuildJobId in deployment record
  - Poll or wait for webhook for build completion
  - Fetch remote logs and append to deployment log
  - On success, pull image from registry and call mechanizeDockerContainer
  - On failure, update deployment status and send notifications
- [ ] 3.3 Modify `rebuildApplication` in `packages/server/src/services/application.ts`
  - Check buildServerId and route to remote or local rebuild
- [ ] 3.4 Add build timeout handling with configurable timeout (default 30 minutes)
  - Cancel remote build on timeout
- [ ] 3.5 Implement exponential backoff for status polling

## 4. API Routes & Controllers
- [ ] 4.1 Create tRPC router at `apps/dokploy/server/api/routers/build-server.ts`
  - Procedures: create, byId, all (list), update, remove, test
  - Implement organization-level access control
- [ ] 4.2 Add build server router to root router in `apps/dokploy/server/api/root.ts`
- [ ] 4.3 Create webhook endpoint for build status updates
  - Add route at `apps/dokploy/app/api/webhooks/build-status/route.ts` (Next.js API route)
  - Validate webhook signatures (provider-specific)
  - Match job ID to deployment and update status
  - Handle idempotent delivery

## 5. Frontend UI Components
- [ ] 5.1 Create build server list page at `apps/dokploy/components/dashboard/settings/build-servers/list-build-servers.tsx`
  - Display all build servers for organization
  - Actions: add, edit, delete, test connection
- [ ] 5.2 Create build server form dialog at `apps/dokploy/components/dashboard/settings/build-servers/add-build-server.tsx`
  - Provider type selector (Google Cloud Build, Generic Remote)
  - Dynamic form fields based on provider type
  - Test connection button
  - Validation feedback
- [ ] 5.3 Update application settings form to include build server selection
  - Add dropdown in `apps/dokploy/components/dashboard/application/general/general-application.tsx`
  - Show "Local Build" option and list of organization build servers
- [ ] 5.4 Update deployment logs view to show remote build status
  - Add build phase indicators in `apps/dokploy/components/dashboard/application/deployments/deployment-logs.tsx`
  - Show link to provider console for remote builds
- [ ] 5.5 Add build server status badges and monitoring UI

## 6. Testing & Validation
- [ ] 6.1 Write unit tests for build server service (CRUD operations)
- [ ] 6.2 Write unit tests for credential encryption/decryption
- [ ] 6.3 Write unit tests for provider implementations (mock API calls)
- [ ] 6.4 Write integration tests for remote build workflow
  - Mock Google Cloud Build API responses
  - Test deployment flow with remote build
  - Test error scenarios (timeout, build failure, network error)
- [ ] 6.5 Test webhook receiver with sample payloads
- [ ] 6.6 Manual testing with real Google Cloud Build project
- [ ] 6.7 Manual testing with generic remote build server

## 7. Documentation
- [ ] 7.1 Write setup guide for Google Cloud Build integration
  - Create GCP project, enable Cloud Build API
  - Create service account and download JSON key
  - Configure IAM permissions
  - Configure registry authentication
- [ ] 7.2 Write setup guide for generic remote build servers
  - API endpoint requirements
  - Webhook format specification
  - Authentication methods
- [ ] 7.3 Update main Dokploy documentation with remote build server features
- [ ] 7.4 Add inline help text and tooltips in UI
- [ ] 7.5 Create troubleshooting guide for common issues

## 8. Security & Compliance
- [ ] 8.1 Audit credential encryption implementation
- [ ] 8.2 Implement credential access logging for audit trail
- [ ] 8.3 Add webhook signature validation for all providers
- [ ] 8.4 Review RBAC for build server management endpoints
- [ ] 8.5 Test SQL injection vectors in build server queries
- [ ] 8.6 Validate provider config inputs against injection attacks

## 9. Performance & Monitoring
- [ ] 9.1 Add metrics for remote build durations
- [ ] 9.2 Add error tracking for build server API failures
- [ ] 9.3 Implement rate limiting for build server management API
- [ ] 9.4 Add database indexes on buildServerId, organizationId
- [ ] 9.5 Test concurrent remote builds (multiple apps using same build server)

## 10. Deployment & Rollout
- [ ] 10.1 Add feature flag `ENABLE_REMOTE_BUILD_SERVERS` with environment variable
- [ ] 10.2 Update Docker Compose / deployment scripts if needed
- [ ] 10.3 Prepare database migration rollback script
- [ ] 10.4 Create release notes highlighting new feature
- [ ] 10.5 Announce feature with example configurations

## Dependencies & Blockers
- **Dependency:** Google Cloud Build requires `@google-cloud/cloudbuild` npm package (add to dependencies)
- **Dependency:** Registry configuration must exist before remote builds can be used
- **Parallel work:** Tasks 2.x (services) and 5.x (UI) can be developed in parallel after schema (1.x) is complete
- **Blocker:** Need webhook endpoint reachable by cloud providers (may require ngrok for local dev)
