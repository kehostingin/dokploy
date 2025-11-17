# Change: Add Global Resource Limits

## Why

Currently, each service (application, database) requires manual configuration of resource limits with unintuitive units (bytes for memory, nanoseconds for CPU). This creates several problems:

1. **Inconsistent defaults**: New services have no resource limits unless manually configured, risking server resource exhaustion
2. **Poor UX**: Users must convert MB to bytes and CPU cores to nanoseconds manually
3. **No centralized control**: Administrators cannot set organization-wide resource policies
4. **Missing for Compose**: Docker Compose services lack resource limit support entirely

A global resource limits system with user-friendly units and UI controls will improve security, resource management, and user experience.

## What Changes

- **New global settings page**: Add "Resources Limit" under Settings menu for configuring default limits
- **User-friendly units**: Change from bytes/nanoseconds to MB/decimal CPU cores (e.g., 0.5 CPU)
- **Slider-based UI**: Replace text inputs with sliders for intuitive value selection
- **Auto-apply defaults**: New services automatically inherit global resource limits
- **Per-service overrides**: Maintain ability to customize limits in each service's advanced menu
- **Compose support**: Add resource limits to Docker Compose services (new functionality)
- **Database schema**: Add settings table for storing global configuration
- **Conversion layer**: Handle unit conversion between user-friendly UI and Docker API requirements

### User Interface Changes

**Settings Menu:**
- New "Resources Limit" page with sliders for:
  - Memory Reservation (MB)
  - Memory Limit (MB)
  - CPU Reservation (decimal cores)
  - CPU Limit (decimal cores)

**Service Advanced Menu:**
- Update existing resource forms with sliders instead of text inputs
- Display values in MB and decimal cores
- Show both user-friendly and raw values

### Technical Changes

**Backend:**
- New `settings` database table for global configuration
- tRPC endpoints for managing global settings
- Service creation logic updated to apply global defaults
- Unit conversion utilities (MB ↔ bytes, cores ↔ nanoseconds)

**Frontend:**
- New settings page component with slider inputs
- Updated resource forms for all service types
- Shared slider component with proper min/max/step values

## Impact

### Affected Specs
- `resource-management` (NEW) - Global resource limit configuration
- `application-resource-limits` (MODIFIED) - Add slider UI and auto-apply defaults
- `database-resource-limits` (MODIFIED) - Add slider UI and auto-apply defaults
- `compose-resource-limits` (NEW) - Add resource limits to Compose services

### Affected Code

**Database Schema:**
- `packages/server/src/db/schema/settings.ts` (NEW)
- `packages/server/src/db/schema/application.ts` (MODIFIED)
- `packages/server/src/db/schema/compose.ts` (MODIFIED)
- Database migration files (NEW)

**Backend Services:**
- `packages/server/src/services/settings.ts` (NEW)
- `packages/server/src/services/application.ts` (MODIFIED)
- `packages/server/src/services/compose.ts` (MODIFIED)
- `packages/server/src/services/postgres.ts` (MODIFIED)
- `packages/server/src/services/mysql.ts` (MODIFIED)
- `packages/server/src/services/mariadb.ts` (MODIFIED)
- `packages/server/src/services/mongo.ts` (MODIFIED)
- `packages/server/src/services/redis.ts` (MODIFIED)

**tRPC API:**
- `apps/api/src/routers/settings.ts` (NEW)
- `apps/api/src/routers/application.ts` (MODIFIED - creation endpoint)
- `apps/api/src/routers/compose.ts` (MODIFIED - creation endpoint)
- Database routers (MODIFIED - creation endpoints)

**Frontend Components:**
- `apps/dokploy/pages/dashboard/settings/resources.tsx` (NEW)
- `apps/dokploy/components/dashboard/settings/resources/` (NEW directory)
- `apps/dokploy/components/dashboard/application/advanced/show-resources.tsx` (MODIFIED)
- `apps/dokploy/components/dashboard/compose/advanced/show-resources.tsx` (NEW)
- Database resource components (MODIFIED - all database types)
- `apps/dokploy/components/ui/slider.tsx` (may need enhancements)

**Utilities:**
- `packages/server/src/utils/resources/` (NEW - conversion utilities)

### Migration Strategy
1. Add settings table with nullable global limits
2. Existing services keep their current resource limits unchanged
3. New services created after deployment automatically get global defaults (if set)
4. UI conversion happens client-side before API calls
5. Backward compatible: services without limits continue to work

### Breaking Changes
None - this is additive functionality with backward compatibility.
