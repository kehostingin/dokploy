# Capability: Build Orchestration

## ADDED Requirements

### Requirement: Trigger Remote Build
Applications with configured build servers SHALL trigger builds on remote infrastructure.

#### Scenario: Trigger Google Cloud Build
- **WHEN** application deployment starts and buildServerId references Google Cloud Build server
- **THEN** system triggers Cloud Build with buildpack/dockerfile, source from git, and stores build job ID in deployment record

#### Scenario: Trigger generic remote build
- **WHEN** application deployment starts and buildServerId references generic remote server
- **THEN** system sends POST request to configured API with build parameters and stores returned job ID

#### Scenario: Trigger build with disabled build server
- **WHEN** application references disabled build server
- **THEN** system rejects deployment with error indicating build server is disabled

#### Scenario: Trigger build without registry configuration
- **WHEN** application uses remote build server but has no registry configured
- **THEN** system rejects deployment requiring registry for remote builds

#### Scenario: Fallback to local build
- **WHEN** application has no buildServerId configured
- **THEN** system uses existing local build workflow on serverId or local docker

### Requirement: Track Remote Build Status
System SHALL monitor remote build progress and update deployment status.

#### Scenario: Receive webhook status update
- **WHEN** remote build server sends webhook notification with job ID and status
- **THEN** system updates deployment record with new status and logs event

#### Scenario: Poll build status
- **WHEN** webhook not available and build is in progress
- **THEN** system polls provider API every 30 seconds for status updates until completion or timeout

#### Scenario: Build completes successfully
- **WHEN** remote build finishes with success status
- **THEN** system fetches build logs, marks build phase complete, and proceeds to image pull phase

#### Scenario: Build fails on remote server
- **WHEN** remote build finishes with error status
- **THEN** system fetches error logs, marks deployment as failed, and sends build error notifications

#### Scenario: Build timeout
- **WHEN** remote build exceeds configured timeout (default 30 minutes)
- **THEN** system attempts to cancel remote build and marks deployment as error with timeout message

### Requirement: Retrieve Remote Build Logs
System SHALL fetch and store logs from remote builds.

#### Scenario: Fetch Google Cloud Build logs
- **WHEN** remote build completes (success or failure)
- **THEN** system fetches build logs via Cloud Build API and appends to deployment log file

#### Scenario: Fetch generic remote logs
- **WHEN** generic remote build completes
- **THEN** system calls configured log endpoint and appends to deployment log file

#### Scenario: Logs unavailable
- **WHEN** remote build completes but logs cannot be fetched (API error, timeout)
- **THEN** system logs warning and includes link to provider console for manual log access

#### Scenario: Stream logs in real-time
- **WHEN** remote build supports log streaming (future enhancement)
- **THEN** system streams logs to deployment log file as they arrive

### Requirement: Cancel Remote Build
Users SHALL be able to cancel in-progress remote builds.

#### Scenario: Cancel Google Cloud Build
- **WHEN** user cancels deployment with active Google Cloud Build job
- **THEN** system calls Cloud Build cancel API with job ID and marks deployment as cancelled

#### Scenario: Cancel generic remote build
- **WHEN** user cancels deployment with active generic remote build
- **THEN** system calls configured cancel endpoint with job ID

#### Scenario: Cancel already completed build
- **WHEN** user attempts to cancel deployment with completed remote build
- **THEN** system returns error indicating build already finished

#### Scenario: Cancel with provider API failure
- **WHEN** cancel request to provider fails (network error, API error)
- **THEN** system marks deployment as cancelled locally and logs provider error for manual cleanup

### Requirement: Build Parameter Translation
System SHALL translate Dokploy build configuration to provider-specific formats.

#### Scenario: Translate Nixpacks build to Cloud Build
- **WHEN** application uses Nixpacks buildType with Google Cloud Build
- **THEN** system generates Cloud Build config using Nixpacks buildpack with app build args and environment

#### Scenario: Translate Dockerfile build to Cloud Build
- **WHEN** application uses Dockerfile buildType with Google Cloud Build
- **THEN** system generates Cloud Build config with docker build step pointing to Dockerfile path

#### Scenario: Pass build secrets to remote build
- **WHEN** application has buildSecrets configured
- **THEN** system passes secrets to remote build via provider's secret mechanism (Cloud Build secrets, API payload encryption)

#### Scenario: Unsupported buildType for provider
- **WHEN** application uses buildType not supported by configured build server (e.g., static build on Cloud Build)
- **THEN** system rejects deployment with error listing supported build types for that provider

### Requirement: Registry Integration for Remote Builds
Remote builds SHALL push images to configured registry for Dokploy to pull.

#### Scenario: Configure image destination
- **WHEN** remote build is triggered
- **THEN** system configures build to push image to registry URL with format: `{registryUrl}/{imagePrefix}/{appName}:latest`

#### Scenario: Authenticate registry for remote build
- **WHEN** remote build needs to push to registry
- **THEN** system provides registry credentials to build server via provider-specific auth mechanism

#### Scenario: Pull image after remote build
- **WHEN** remote build completes successfully and image is pushed to registry
- **THEN** system pulls image from registry to deployment server using existing mechanizeDockerContainer flow

#### Scenario: Image push fails
- **WHEN** remote build succeeds but image push to registry fails
- **THEN** system marks deployment as failed with registry error details

### Requirement: Build Environment Configuration
Remote builds SHALL receive necessary environment and context.

#### Scenario: Pass git repository to remote build
- **WHEN** application uses git/github/gitlab source
- **THEN** system provides repository URL, branch, and build path to remote build server

#### Scenario: Pass build arguments
- **WHEN** application has buildArgs configured
- **THEN** system includes build args in remote build configuration

#### Scenario: Pass application environment variables
- **WHEN** application has environment variables needed at build time
- **THEN** system filters and passes relevant env vars to remote build

#### Scenario: Private repository access
- **WHEN** application uses private git repository
- **THEN** system configures remote build with SSH key or token for repository access
