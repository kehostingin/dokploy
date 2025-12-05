# Change: Add Remote Build Server Support

## Why
Currently, Dokploy builds applications directly on the server where they will be deployed (or on a specified serverId). This approach has limitations:
- Resource contention: builds compete with running applications for CPU/memory
- Build tool dependencies: requires build tools (nixpacks, buildpacks, etc.) on deployment servers
- Limited scaling: cannot offload builds to specialized infrastructure
- Cloud integration: users cannot leverage managed build services like Google Cloud Build or AWS CodeBuild

Adding remote build server support allows users to separate build and deployment concerns, leverage cloud-managed build services, and improve resource utilization.

## What Changes
- Add new `buildServer` schema for managing remote build server configurations (Google Cloud Build, Generic Remote API)
- Extend applications to optionally reference a build server instead of building locally
- Implement build server provider abstraction for Google Cloud Build and generic remote servers
- Modify deployment workflow to coordinate remote builds and pull resulting images from registry
- Add organization-level build server management (CRUD operations)
- Store encrypted credentials for cloud build services in database
- Add build status tracking for remote builds with webhooks/polling

**Key workflow changes:**
1. User configures build server at organization level (credentials, provider type)
2. Application optionally references a build server
3. On deployment, Dokploy triggers remote build via provider API
4. Remote build pushes image to configured registry
5. Dokploy pulls image from registry and deploys to target server

## Impact
- **New capabilities:**
  - `build-server-management`: CRUD for build server configurations
  - `build-orchestration`: Coordinate builds on remote servers
  - `deployment-workflow`: MODIFIED to support remote build path

- **Affected code:**
  - `packages/server/src/db/schema/` - New build_server table
  - `packages/server/src/services/application.ts` - deployApplication/rebuildApplication logic
  - `packages/server/src/utils/builders/` - New providers for remote builds
  - `apps/dokploy/server/api/routers/` - New build-server router
  - `apps/dokploy/components/` - UI for build server management

- **Database changes:**
  - New `build_server` table with encrypted credentials
  - Add `buildServerId` foreign key to `application` table

- **Breaking changes:** None - remote build servers are optional, existing local builds continue to work
