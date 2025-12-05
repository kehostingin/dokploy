# Capability: Deployment Workflow

## MODIFIED Requirements

### Requirement: Application Deployment Process
Applications SHALL be deployed using either local or remote build workflows based on configuration.

**Note:** This extends the existing deployment workflow to support remote build servers.

#### Scenario: Deploy with remote build server
- **WHEN** application has buildServerId configured and deployment is triggered
- **THEN** system validates build server is enabled, triggers remote build, waits for completion, pulls image from registry, and deploys to target server

#### Scenario: Deploy with local build
- **WHEN** application has no buildServerId configured and deployment is triggered
- **THEN** system uses existing local build workflow (clone repo, run getBuildCommand, mechanizeDockerContainer)

#### Scenario: Remote build with existing image in registry
- **WHEN** deployment uses remote build and image already exists in registry
- **THEN** system pulls existing image for deployment (no rebuild unless forced)

#### Scenario: Rebuild with remote build server
- **WHEN** rebuildApplication is called for app with buildServerId
- **THEN** system triggers new remote build, waits for completion, and redeploys

#### Scenario: Deployment with remote build failure
- **WHEN** remote build fails during deployment
- **THEN** system marks deployment as error, fetches remote logs, sends notifications, and does not attempt deployment phase

## ADDED Requirements

### Requirement: Build Server Selection
Applications SHALL optionally reference a build server for builds.

#### Scenario: Associate application with build server
- **WHEN** user configures application with buildServerId
- **THEN** system validates build server exists in same organization and stores reference

#### Scenario: Remove build server from application
- **WHEN** user sets buildServerId to null
- **THEN** system removes reference and future deployments use local build

#### Scenario: Reference build server from different organization
- **WHEN** user attempts to set buildServerId from another organization
- **THEN** system rejects with FORBIDDEN error

#### Scenario: Reference non-existent build server
- **WHEN** user sets buildServerId to invalid ID
- **THEN** system rejects with NOT_FOUND error

### Requirement: Deployment Status Tracking
Deployments SHALL track remote build job information.

#### Scenario: Store remote build job ID
- **WHEN** remote build is triggered
- **THEN** system stores build job ID in deployment record for status tracking and log retrieval

#### Scenario: Display remote build progress
- **WHEN** user views deployment logs for remote build
- **THEN** system displays build status (pending, running, success, failed) and includes link to provider console

#### Scenario: Deployment phase indicators
- **WHEN** deployment uses remote build
- **THEN** system shows separate phases: "Triggering build", "Building remotely", "Pulling image", "Deploying"

### Requirement: Webhook Receiver
System SHALL accept build status webhooks from remote build servers.

#### Scenario: Receive Google Cloud Build webhook
- **WHEN** Cloud Build sends webhook to configured endpoint with build status
- **THEN** system validates signature, matches job ID to deployment, and updates deployment status

#### Scenario: Receive generic remote webhook
- **WHEN** generic remote server sends webhook with agreed format
- **THEN** system validates webhook secret, extracts job ID and status, and updates deployment

#### Scenario: Invalid webhook signature
- **WHEN** webhook received with invalid signature or secret
- **THEN** system rejects with 401 Unauthorized and logs security event

#### Scenario: Webhook for unknown job ID
- **WHEN** webhook contains job ID not found in deployment records
- **THEN** system logs warning and returns 200 OK (idempotent)

#### Scenario: Duplicate webhook delivery
- **WHEN** same webhook delivered multiple times for same status
- **THEN** system handles idempotently, no duplicate status updates

### Requirement: Build Server Health Monitoring
System SHALL monitor build server availability.

#### Scenario: Detect unreachable build server
- **WHEN** build trigger fails with network error
- **THEN** system marks deployment as error and logs build server connectivity issue

#### Scenario: Build server rate limiting
- **WHEN** build trigger fails with rate limit error
- **THEN** system retries with exponential backoff or marks as error after max retries

#### Scenario: Build server maintenance
- **WHEN** build server disabled by admin
- **THEN** new deployments for apps using that build server are rejected with clear error message
