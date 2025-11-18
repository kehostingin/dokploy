# Docker Compose Resource Limits Specification

## ADDED Requirements

### Requirement: Compose Service Resource Configuration

The system SHALL support configuring resource limits for Docker Compose services with the same UI and behavior as applications and databases.

#### Scenario: Configure compose service resources

- **GIVEN** a user is editing a Docker Compose service in the Advanced menu
- **WHEN** they navigate to the Resources section
- **THEN** they SHALL see slider-based controls for memory and CPU limits
- **AND** be able to configure the same resource types as applications (memory reservation, memory limit, CPU reservation, CPU limit)

#### Scenario: Apply resources to generated compose file

- **GIVEN** a compose service has memory limit set to 2048 MB and CPU limit set to 1.5 cores
- **WHEN** the compose file is generated
- **THEN** the service definition SHALL include:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 2048M
        cpus: '1.5'
      reservations:
        memory: 256M
        cpus: '0.5'
  ```

#### Scenario: Global defaults for compose services

- **GIVEN** global memory limit is set to 1024 MB
- **WHEN** a new compose service is created without explicit limits
- **THEN** the compose service SHALL inherit the global default
- **AND** generate the appropriate deploy.resources section in the compose file

### Requirement: Compose Resource Storage

The system SHALL store compose service resource limits in the compose table using the same format as applications and databases.

#### Scenario: Store compose resource limits

- **GIVEN** a compose service is created with memory limit of 2048 MB
- **WHEN** the resource limits are saved
- **THEN** the system SHALL store "2147483648" in the memoryLimit column
- **AND** use this value when generating the compose file

#### Scenario: Compose service without resource limits

- **GIVEN** a compose service has no resource limits configured
- **WHEN** the compose file is generated
- **THEN** the deploy.resources section SHALL be omitted
- **AND** the container SHALL run with Docker's default unlimited resources

### Requirement: Compose Deploy Configuration Format

The system SHALL convert stored resource limits to Docker Compose v3 deploy configuration format.

#### Scenario: Convert bytes to compose memory format

- **GIVEN** memoryLimit is stored as "2147483648" bytes
- **WHEN** generating the compose file
- **THEN** the system SHALL output "2048M" in the deploy.resources.limits.memory field

#### Scenario: Convert nanoseconds to compose CPU format

- **GIVEN** cpuLimit is stored as "1500000000" nanoseconds
- **WHEN** generating the compose file
- **THEN** the system SHALL output "1.5" in the deploy.resources.limits.cpus field

#### Scenario: Handle null resource values

- **GIVEN** a compose service has memoryLimit set but memoryReservation is null
- **WHEN** generating the compose file
- **THEN** the system SHALL only include the limits section
- **AND** omit the reservations section

### Requirement: Compose Resource Validation

The system SHALL validate compose resource limits using the same rules as applications and databases.

#### Scenario: Validate compose memory limits

- **GIVEN** a user attempts to set compose memory limit to 32 MB
- **WHEN** the form is submitted
- **THEN** the system SHALL display error "Memory limit must be at least 64 MB"

#### Scenario: Validate compose CPU limits

- **GIVEN** a user attempts to set compose CPU reservation to 8.5 cores
- **WHEN** the form is validated
- **THEN** the system SHALL display error "CPU reservation exceeds maximum of 8.0 cores"

### Requirement: Multi-Service Compose Support

The system SHALL handle resource limits for compose projects containing multiple services.

#### Scenario: Individual service resource configuration

- **GIVEN** a compose project with 3 services (web, api, database)
- **WHEN** a user configures resource limits
- **THEN** the system SHALL allow setting different limits for each service
- **AND** apply them independently in the generated compose file

#### Scenario: Compose-level global limits

- **GIVEN** a compose project without per-service limits configured
- **WHEN** the compose file is generated with global defaults
- **THEN** all services in the compose SHALL inherit the same global defaults
- **AND** each service SHALL have its own deploy.resources section

### Requirement: Compose Resource UI Consistency

The system SHALL provide the same slider-based resource configuration UI for compose services as for applications and databases.

#### Scenario: Compose resources page layout

- **GIVEN** a user navigates to Compose > Advanced > Resources
- **WHEN** the page loads
- **THEN** it SHALL display the same slider controls and ranges as the application resources page
- **AND** use identical validation rules and error messages

#### Scenario: Compose resource tooltips

- **GIVEN** a user hovers over the compose memory limit slider
- **WHEN** the tooltip is displayed
- **THEN** it SHALL show the same explanation as in application resources
- **AND** include compose-specific notes if applicable
