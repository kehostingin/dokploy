# Database Resource Limits Specification

## MODIFIED Requirements

### Requirement: Database Resource Configuration UI

The system SHALL provide a slider-based interface for configuring database resource limits (PostgreSQL, MySQL, MariaDB, MongoDB, Redis) using user-friendly units.

#### Scenario: Configure database resources with sliders

- **GIVEN** a user is editing PostgreSQL resource limits in the Advanced menu
- **WHEN** they use the memory limit slider to select 4096 MB
- **THEN** the system SHALL display "4096 MB" in the UI
- **AND** store "4294967296" bytes in the database
- **AND** apply this limit to the database container

#### Scenario: Consistent UI across all database types

- **GIVEN** a user is configuring resources for different database types
- **WHEN** they navigate to Advanced > Resources for PostgreSQL, MySQL, MariaDB, MongoDB, or Redis
- **THEN** all database types SHALL use identical slider-based UI
- **AND** have the same slider ranges and step values

#### Scenario: Database-specific default values

- **GIVEN** global memory limit is set to 1024 MB
- **WHEN** creating a PostgreSQL instance without explicit limits
- **THEN** the instance SHALL inherit the global default of 1024 MB

### Requirement: Automatic Global Default Application for Databases

The system SHALL automatically apply global resource limit defaults to new database instances when no explicit limits are provided.

#### Scenario: Create Redis with global defaults

- **GIVEN** global CPU limit is set to 1.0 core
- **WHEN** a user creates a new Redis instance without specifying CPU limits
- **THEN** the Redis instance SHALL be created with cpuLimit: "1000000000" (1.0 core in nanoseconds)

#### Scenario: Create MongoDB with explicit limits

- **GIVEN** global memory reservation is 512 MB
- **WHEN** creating a MongoDB instance with explicit memory reservation of 1024 MB
- **THEN** the MongoDB instance SHALL use 1024 MB
- **AND** ignore the global default

### Requirement: Database Resource Validation

The system SHALL validate database resource limit values with same rules as applications.

#### Scenario: Validate database memory minimum

- **GIVEN** a user attempts to set MySQL memory limit to 50 MB
- **WHEN** the form is submitted
- **THEN** the system SHALL display error "Memory limit must be at least 64 MB"

#### Scenario: Warning for production databases with low resources

- **GIVEN** a user sets PostgreSQL memory limit to 128 MB
- **WHEN** the form is validated
- **THEN** the system SHALL display warning "PostgreSQL typically requires at least 256 MB for production workloads"

## ADDED Requirements

### Requirement: Database Type-Specific Recommendations

The system SHALL provide tooltips with recommended resource limits for each database type.

#### Scenario: PostgreSQL recommendations

- **GIVEN** a user hovers over the PostgreSQL memory limit field
- **WHEN** the tooltip is displayed
- **THEN** it SHALL show "Recommended: 512 MB minimum for small workloads, 2 GB+ for production"

#### Scenario: Redis recommendations

- **GIVEN** a user hovers over the Redis memory limit field
- **WHEN** the tooltip is displayed
- **THEN** it SHALL show "Recommended: Set based on dataset size + 20% overhead"

#### Scenario: MongoDB recommendations

- **GIVEN** a user hovers over the MongoDB memory limit field
- **WHEN** the tooltip is displayed
- **THEN** it SHALL show "Recommended: At least 1 GB for production, scales with working set size"
