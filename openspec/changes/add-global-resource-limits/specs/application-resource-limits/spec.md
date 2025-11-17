# Application Resource Limits Specification

## MODIFIED Requirements

### Requirement: Application Resource Configuration UI

The system SHALL provide a slider-based interface for configuring application resource limits using user-friendly units (MB for memory, decimal cores for CPU).

#### Scenario: Configure resources with sliders

- **GIVEN** a user is editing application resource limits in the Advanced menu
- **WHEN** they use the memory limit slider to select 2048 MB
- **THEN** the system SHALL display "2048 MB" in the UI
- **AND** store "2147483648" bytes in the database
- **AND** apply this limit to the Docker container

#### Scenario: Manual text input override

- **GIVEN** a user needs to set a precise value not on the slider scale
- **WHEN** they enter "3500" MB in the text input field
- **THEN** the system SHALL accept the manual value
- **AND** update the slider position accordingly
- **AND** store the converted byte value

#### Scenario: CPU slider with decimal precision

- **GIVEN** a user adjusts the CPU limit slider
- **WHEN** they select 1.5 cores
- **THEN** the system SHALL display "1.5" cores
- **AND** store "1500000000" nanoseconds in the database

#### Scenario: Display existing resource limits

- **GIVEN** an application has memory limit of 1073741824 bytes
- **WHEN** the user opens the resources form
- **THEN** the slider SHALL be positioned at 1024 MB
- **AND** the text input SHALL display "1024"

### Requirement: Automatic Global Default Application

The system SHALL automatically apply global resource limit defaults to new applications when no explicit limits are provided.

#### Scenario: Create application with global defaults

- **GIVEN** global memory limit is set to 2048 MB and CPU limit is set to 2.0 cores
- **WHEN** a user creates a new application without specifying resource limits
- **THEN** the application SHALL be created with:
  - memoryLimit: "2147483648" (2048 MB in bytes)
  - cpuLimit: "2000000000" (2.0 cores in nanoseconds)

#### Scenario: Explicit limits override defaults

- **GIVEN** global memory limit is 1024 MB
- **WHEN** creating an application with explicit memory limit of 4096 MB
- **THEN** the application SHALL use 4096 MB
- **AND** ignore the global default

### Requirement: Resource Validation

The system SHALL validate resource limit values to prevent invalid configurations.

#### Scenario: Validate memory minimum

- **GIVEN** a user attempts to set memory limit to 32 MB
- **WHEN** the form is submitted
- **THEN** the system SHALL display error "Memory limit must be at least 64 MB"

#### Scenario: Validate reservation less than limit

- **GIVEN** memory limit is set to 512 MB
- **WHEN** user attempts to set memory reservation to 1024 MB
- **THEN** the system SHALL display error "Reservation cannot exceed limit"

#### Scenario: Validate CPU minimum

- **GIVEN** a user attempts to set CPU limit to 0.05 cores
- **WHEN** the form is validated
- **THEN** the system SHALL display error "CPU limit must be at least 0.1 cores"

## ADDED Requirements

### Requirement: Slider Range Configuration

The system SHALL provide appropriate slider ranges for each resource type based on common use cases.

#### Scenario: Memory limit slider range

- **GIVEN** a user is configuring memory limits
- **WHEN** they interact with the slider
- **THEN** the slider SHALL have:
  - Minimum: 128 MB
  - Maximum: 16384 MB (16 GB)
  - Step: 128 MB

#### Scenario: CPU limit slider range

- **GIVEN** a user is configuring CPU limits
- **WHEN** they interact with the slider
- **THEN** the slider SHALL have:
  - Minimum: 0.25 cores
  - Maximum: 8.0 cores
  - Step: 0.25 cores

#### Scenario: Memory reservation slider range

- **GIVEN** a user is configuring memory reservation
- **WHEN** they interact with the slider
- **THEN** the slider SHALL have:
  - Minimum: 64 MB
  - Maximum: 8192 MB (8 GB)
  - Step: 64 MB

#### Scenario: CPU reservation slider range

- **GIVEN** a user is configuring CPU reservation
- **WHEN** they interact with the slider
- **THEN** the slider SHALL have:
  - Minimum: 0.1 cores
  - Maximum: 4.0 cores
  - Step: 0.1 cores
