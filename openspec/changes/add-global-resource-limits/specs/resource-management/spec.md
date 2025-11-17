# Resource Management Specification

## ADDED Requirements

### Requirement: Global Resource Limit Configuration

The system SHALL provide a global settings interface for configuring default resource limits that automatically apply to newly created services.

#### Scenario: Configure global memory limits

- **GIVEN** an administrator is on the Settings page
- **WHEN** they navigate to "Resources Limit" and set global memory reservation to 256 MB and memory limit to 1024 MB
- **THEN** the system SHALL save these values in the settings table
- **AND** all subsequently created services SHALL inherit these memory limits by default

#### Scenario: Configure global CPU limits

- **GIVEN** global CPU reservation is set to 0.5 cores and CPU limit is set to 2.0 cores
- **WHEN** a new application is created without explicit CPU limits
- **THEN** the application SHALL be created with CPU reservation of 500000000 nanoseconds and CPU limit of 2000000000 nanoseconds

#### Scenario: Override global defaults per service

- **GIVEN** global memory limit is set to 1024 MB
- **WHEN** creating a new service with explicit memory limit of 2048 MB
- **THEN** the service SHALL use 2048 MB and NOT the global default

#### Scenario: No global settings configured

- **GIVEN** no global resource limits are configured
- **WHEN** a new service is created
- **THEN** the system SHALL apply hardcoded default values (256 MB reservation, 1 GB limit, 0.5 CPU reservation, 1 CPU limit)

### Requirement: Settings Persistence

The system SHALL store global resource limit settings in a dedicated settings table with nullable fields for forward compatibility.

#### Scenario: First-time settings initialization

- **GIVEN** no settings record exists
- **WHEN** an administrator accesses the Resources Limit page for the first time
- **THEN** the system SHALL create a settings record with all resource limits set to null
- **AND** display empty/default values in the UI

#### Scenario: Update existing settings

- **GIVEN** global settings already exist with specific values
- **WHEN** an administrator updates the memory limit from 1024 MB to 2048 MB
- **THEN** the system SHALL update only the changed field
- **AND** preserve other existing settings

### Requirement: Unit Conversion

The system SHALL handle conversion between user-friendly units (MB, decimal cores) and Docker API units (bytes, nanoseconds).

#### Scenario: Convert MB to bytes

- **GIVEN** user sets memory limit to 512 MB in the UI
- **WHEN** creating a service
- **THEN** the system SHALL store 536870912 bytes in the service record

#### Scenario: Convert decimal cores to nanoseconds

- **GIVEN** user sets CPU limit to 1.5 cores in the UI
- **WHEN** creating a service
- **THEN** the system SHALL store 1500000000 nanoseconds in the service record

#### Scenario: Display bytes as MB

- **GIVEN** a service has memory limit of 1073741824 bytes
- **WHEN** displaying in the UI
- **THEN** the system SHALL show 1024 MB

#### Scenario: Display nanoseconds as cores

- **GIVEN** a service has CPU limit of 2000000000 nanoseconds
- **WHEN** displaying in the UI
- **THEN** the system SHALL show 2.0 cores

### Requirement: Settings API

The system SHALL provide tRPC endpoints for managing global resource limit settings.

#### Scenario: Fetch global settings

- **GIVEN** an authenticated user
- **WHEN** they request global settings via tRPC
- **THEN** the system SHALL return current global resource limits or null values if not set

#### Scenario: Update global settings with validation

- **GIVEN** an administrator attempts to set memory limit to 50 MB
- **WHEN** the update request is validated
- **THEN** the system SHALL reject the request with error message "Memory limit must be at least 64 MB"

#### Scenario: Unauthenticated access

- **GIVEN** an unauthenticated request to update settings
- **WHEN** the request is processed
- **THEN** the system SHALL return authentication error
