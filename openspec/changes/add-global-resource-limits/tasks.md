# Implementation Tasks

## 1. Database Schema & Migration

- [ ] 1.1 Create settings schema (`packages/server/src/db/schema/settings.ts`)
  - [ ] Define settings table with resource limit fields (MB and decimal cores format)
  - [ ] Add Zod validation schemas for API operations
  - [ ] Export settings relations if needed
- [ ] 1.2 Update compose schema (`packages/server/src/db/schema/compose.ts`)
  - [ ] Add memoryReservation, memoryLimit, cpuReservation, cpuLimit fields
  - [ ] Update Zod schemas for compose API operations
- [ ] 1.3 Create database migration
  - [ ] Write up migration to create settings table
  - [ ] Write up migration to add resource fields to compose table
  - [ ] Write down migration for rollback
  - [ ] Test migration locally
- [ ] 1.4 Update schema exports (`packages/server/src/db/schema/index.ts`)
  - [ ] Export settings schema and types

## 2. Utility Functions

- [ ] 2.1 Create conversion utilities (`packages/server/src/utils/resources/conversions.ts`)
  - [ ] Implement `mbToBytes(mb: string): string`
  - [ ] Implement `bytesToMb(bytes: string): string`
  - [ ] Implement `coresToNanoseconds(cores: string): string`
  - [ ] Implement `nanosecondsToCores(nanoseconds: string): string`
  - [ ] Add input validation and error handling
- [ ] 2.2 Write unit tests for conversions (`packages/server/__test__/conversions.test.ts`)
  - [ ] Test MB to bytes conversion
  - [ ] Test bytes to MB conversion
  - [ ] Test cores to nanoseconds conversion
  - [ ] Test nanoseconds to cores conversion
  - [ ] Test edge cases (zero, very large numbers, decimals)

## 3. Backend Services

- [ ] 3.1 Create settings service (`packages/server/src/services/settings.ts`)
  - [ ] Implement `getGlobalSettings()` - fetch or create default settings
  - [ ] Implement `updateGlobalSettings()` - update resource limits
  - [ ] Implement `getDefaultResourceLimits()` - get defaults with fallback
  - [ ] Add proper error handling
- [ ] 3.2 Update application service (`packages/server/src/services/application.ts`)
  - [ ] Modify `createApplication` to apply global defaults
  - [ ] Use conversion utilities when applying defaults
  - [ ] Ensure explicit values take precedence over globals
- [ ] 3.3 Update database services (apply same pattern to each)
  - [ ] Update `packages/server/src/services/postgres.ts`
  - [ ] Update `packages/server/src/services/mysql.ts`
  - [ ] Update `packages/server/src/services/mariadb.ts`
  - [ ] Update `packages/server/src/services/mongo.ts`
  - [ ] Update `packages/server/src/services/redis.ts`
- [ ] 3.4 Update compose service (`packages/server/src/services/compose.ts`)
  - [ ] Add resource limit fields to compose creation
  - [ ] Apply global defaults to new compose services
  - [ ] Update compose file generation to include deploy.resources
  - [ ] Handle conversion from bytes/nanoseconds to compose format (e.g., "2048M", "1.5")

## 4. tRPC API Routes

- [ ] 4.1 Create settings router (`apps/api/src/routers/settings.ts`)
  - [ ] Add `getSettings` query with authentication check
  - [ ] Add `updateSettings` mutation with admin authorization
  - [ ] Add input validation with Zod schemas
  - [ ] Export router
- [ ] 4.2 Register settings router (`apps/api/src/routers/index.ts`)
  - [ ] Import and add settings router to main router
- [ ] 4.3 Update application router (`apps/api/src/routers/application.ts`)
  - [ ] Ensure create mutation works with new default logic (should be automatic)
- [ ] 4.4 Update database routers
  - [ ] Verify postgres, mysql, mariadb, mongo, redis routers support new defaults
- [ ] 4.5 Update compose router (`apps/api/src/routers/compose.ts`)
  - [ ] Add resource limit fields to create/update schemas
  - [ ] Ensure default application logic works

## 5. Frontend - Settings Page

- [ ] 5.1 Create settings page route (`apps/dokploy/pages/dashboard/settings/resources.tsx`)
  - [ ] Set up page layout and structure
  - [ ] Add authentication check
  - [ ] Import and render main settings component
- [ ] 5.2 Create settings form component (`apps/dokploy/components/dashboard/settings/resources/show-resources.tsx`)
  - [ ] Set up React Hook Form with Zod validation
  - [ ] Create form fields for all resource types (4 sliders + text inputs)
  - [ ] Implement slider + text input combo pattern
  - [ ] Add tooltips explaining each resource type
  - [ ] Implement save functionality with tRPC mutation
  - [ ] Add loading and error states
  - [ ] Display success/error toasts
- [ ] 5.3 Add navigation menu item
  - [ ] Update settings navigation to include "Resources Limit" link
  - [ ] Ensure proper icon and positioning

## 6. Frontend - Resource Form Components

- [ ] 6.1 Create shared slider component (`apps/dokploy/components/dashboard/shared/resource-slider.tsx`)
  - [ ] Build reusable slider + text input component
  - [ ] Props: label, value, onChange, min, max, step, unit, tooltip
  - [ ] Handle value synchronization between slider and text input
  - [ ] Proper formatting and validation
- [ ] 6.2 Update application resources (`apps/dokploy/components/dashboard/application/advanced/show-resources.tsx`)
  - [ ] Replace text inputs with slider components
  - [ ] Update form to use MB and decimal cores
  - [ ] Add conversion between UI values and API values
  - [ ] Update tooltips with new units
  - [ ] Maintain backward compatibility with existing data
- [ ] 6.3 Update database resources (apply same changes to each)
  - [ ] Create or update PostgreSQL resources component
  - [ ] Create or update MySQL resources component
  - [ ] Create or update MariaDB resources component
  - [ ] Create or update MongoDB resources component
  - [ ] Create or update Redis resources component
  - [ ] Ensure consistent UI across all database types
- [ ] 6.4 Create compose resources component (`apps/dokploy/components/dashboard/compose/advanced/show-resources.tsx`)
  - [ ] Create new resources form for compose services
  - [ ] Use same slider pattern as applications/databases
  - [ ] Integrate with compose update mutation
  - [ ] Add appropriate validation

## 7. Validation & Error Handling

- [ ] 7.1 Frontend validation
  - [ ] Validate minimum values (64 MB memory reservation, 0.1 CPU, etc.)
  - [ ] Validate reservation < limit for both memory and CPU
  - [ ] Validate maximum values within slider ranges
  - [ ] Display clear error messages
- [ ] 7.2 Backend validation
  - [ ] Add Zod schemas with proper min/max constraints
  - [ ] Validate on settings update endpoint
  - [ ] Validate on service creation endpoints
  - [ ] Return descriptive error messages
- [ ] 7.3 Database-specific warnings
  - [ ] Add warning for PostgreSQL < 256 MB
  - [ ] Add warning for MongoDB < 1 GB
  - [ ] Add informational tooltips for each database type

## 8. Testing

- [ ] 8.1 Unit tests
  - [ ] Test conversion utilities (already covered in 2.2)
  - [ ] Test settings service functions
  - [ ] Test default application logic in service creation
- [ ] 8.2 Integration tests
  - [ ] Test creating application with global defaults
  - [ ] Test creating application with explicit limits
  - [ ] Test creating database with global defaults
  - [ ] Test creating compose service with global defaults
  - [ ] Test updating global settings
  - [ ] Test slider UI component behavior
- [ ] 8.3 Manual testing
  - [ ] Test settings page UI and functionality
  - [ ] Test each service type resource form
  - [ ] Verify conversions are correct in Docker containers
  - [ ] Test with existing services (should be unchanged)
  - [ ] Test slider ranges and step values
  - [ ] Test text input override functionality

## 9. Documentation

- [ ] 9.1 Update inline code documentation
  - [ ] Add JSDoc comments to conversion utilities
  - [ ] Add comments explaining default application logic
  - [ ] Document settings table schema
- [ ] 9.2 User-facing documentation (if applicable)
  - [ ] Document how to configure global resource limits
  - [ ] Explain resource limit concepts (reservation vs limit)
  - [ ] Provide recommended values for different use cases

## 10. Deployment & Verification

- [ ] 10.1 Pre-deployment checks
  - [ ] Run all tests and ensure they pass
  - [ ] Run type checking (pnpm typecheck)
  - [ ] Run linting (pnpm lint)
  - [ ] Test migration in development environment
- [ ] 10.2 Deployment
  - [ ] Run database migration
  - [ ] Deploy backend changes
  - [ ] Deploy frontend changes
- [ ] 10.3 Post-deployment verification
  - [ ] Verify settings page loads without errors
  - [ ] Create test service and confirm defaults apply
  - [ ] Verify existing services still function correctly
  - [ ] Check Docker container resource limits are applied correctly
  - [ ] Verify slider UI works across all service types
