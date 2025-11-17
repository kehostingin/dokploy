# Design: Global Resource Limits

## Context

Dokploy currently stores resource limits as strings representing:
- Memory: bytes (e.g., "1073741824" for 1GB)
- CPU: nanoseconds (e.g., "1000000000" for 1 CPU core)

These are passed directly to the Docker API. The current UI uses text inputs, requiring users to manually calculate byte/nanosecond values. This change introduces:
1. A global settings system for default resource limits
2. User-friendly units (MB for memory, decimal for CPU)
3. Slider-based UI for better UX
4. Automatic application of defaults to new services

### Stakeholders
- **End Users**: Benefit from improved UX and automatic resource limits
- **System Administrators**: Gain centralized resource policy control
- **Developers**: Need to maintain unit conversion and backward compatibility

### Constraints
- Must maintain backward compatibility with existing services
- Docker API requires nanoseconds for CPU and bytes for memory
- Database stores values as text (current schema)
- Must work with Docker Swarm resource specification format

## Goals / Non-Goals

### Goals
- Provide global default resource limits configurable from Settings
- Improve UX with MB/decimal CPU units and sliders
- Auto-apply global defaults to new services
- Add resource limits to Compose services
- Maintain backward compatibility with existing services
- Keep conversion logic isolated and testable

### Non-Goals
- Auto-updating existing services (too risky - users may have tuned limits)
- Dynamic resource scaling based on load
- Resource limit recommendations or auto-tuning
- Multi-tenancy resource quotas (future consideration)
- Real-time resource limit changes without redeploy

## Decisions

### 1. Settings Storage

**Decision**: Create new `settings` table with JSON column for global resource limits

**Rationale**:
- Single row table pattern (one settings record per Dokploy instance)
- JSON column allows flexible future expansion
- Nullable fields mean defaults are optional
- Follows existing schema patterns in project

**Schema**:
```typescript
export const settings = pgTable("settings", {
  settingsId: text("settingsId").notNull().primaryKey().$defaultFn(() => nanoid()),
  // Global resource defaults (all nullable)
  globalMemoryReservation: text("globalMemoryReservation"), // MB
  globalMemoryLimit: text("globalMemoryLimit"), // MB
  globalCpuReservation: text("globalCpuReservation"), // decimal cores
  globalCpuLimit: text("globalCpuLimit"), // decimal cores
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});
```

**Alternatives Considered**:
- Environment variables: Too rigid, requires restart, no UI
- Hardcoded defaults: Not configurable
- Per-project settings: Too complex for initial implementation

### 2. Unit Storage Format

**Decision**: Store UI values (MB and decimal cores) directly in settings table, but keep bytes/nanoseconds in service tables

**Rationale**:
- Settings table uses user-friendly units (easier to understand in database)
- Service tables keep Docker API units (no migration needed, backward compatible)
- Conversion happens at service creation time
- Clear separation: settings = human values, services = Docker values

**Conversion Functions**:
```typescript
// packages/server/src/utils/resources/conversions.ts
export const mbToBytes = (mb: string): string => {
  const mbNum = Number.parseFloat(mb);
  return (mbNum * 1024 * 1024).toString();
};

export const bytesToMb = (bytes: string): string => {
  const bytesNum = Number.parseFloat(bytes);
  return (bytesNum / 1024 / 1024).toFixed(0);
};

export const coresToNanoseconds = (cores: string): string => {
  const coresNum = Number.parseFloat(cores);
  return (coresNum * 1000000000).toString();
};

export const nanosecondsToCores = (nanoseconds: string): string => {
  const nsNum = Number.parseFloat(nanoseconds);
  return (nsNum / 1000000000).toString();
};
```

### 3. Slider Configuration

**Decision**: Use Radix UI Slider with specific ranges for each resource type

**Ranges**:
- Memory Reservation: 64 MB - 8192 MB (8 GB), step: 64 MB
- Memory Limit: 128 MB - 16384 MB (16 GB), step: 128 MB
- CPU Reservation: 0.1 - 4.0 cores, step: 0.1
- CPU Limit: 0.25 - 8.0 cores, step: 0.25

**Rationale**:
- Covers common use cases (most services < 8GB RAM, < 4 CPUs)
- Step sizes prevent overly granular values
- Reservation < Limit enforced by UI validation
- Power users can still manually enter text (fallback input)

**Component Pattern**:
```tsx
<FormField
  control={form.control}
  name="memoryLimit"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Memory Limit (MB)</FormLabel>
      <FormControl>
        <div className="flex gap-4 items-center">
          <Slider
            min={128}
            max={16384}
            step={128}
            value={[Number.parseFloat(field.value || "512")]}
            onValueChange={(value) => field.onChange(value[0].toString())}
          />
          <Input
            className="w-24"
            value={field.value}
            onChange={field.onChange}
          />
        </div>
      </FormControl>
    </FormItem>
  )}
/>
```

**Alternatives Considered**:
- Slider only: Less flexible for power users
- Text input with number type: Current approach, poor UX
- Preset buttons (Small/Medium/Large): Too limiting

### 4. Default Application Strategy

**Decision**: Check for global settings at service creation time and apply if no explicit values provided

**Implementation**:
```typescript
// In createApplication, createPostgres, etc.
const settings = await getGlobalSettings();

const memoryReservation = input.memoryReservation
  ?? (settings.globalMemoryReservation
    ? mbToBytes(settings.globalMemoryReservation)
    : DEFAULT_MEMORY_RESERVATION);

const memoryLimit = input.memoryLimit
  ?? (settings.globalMemoryLimit
    ? mbToBytes(settings.globalMemoryLimit)
    : DEFAULT_MEMORY_LIMIT);

// Similar for CPU limits
```

**Rationale**:
- Explicit values always take precedence
- Falls back to global settings if available
- Falls back to hardcoded defaults if no global settings
- No database queries if values already provided
- Clean ternary chain makes logic clear

**Alternatives Considered**:
- Always apply global settings: Breaks explicit user choices
- Database triggers: Too complex, harder to debug
- Middleware/hooks: Adds indirection

### 5. Compose Service Support

**Decision**: Add resource limit fields to compose table and apply via Docker Compose deploy configuration

**Schema Addition**:
```typescript
// Add to compose table
memoryReservation: text("memoryReservation"),
memoryLimit: text("memoryLimit"),
cpuReservation: text("cpuReservation"),
cpuLimit: text("cpuLimit"),
```

**Docker Compose Integration**:
```typescript
// In compose generation logic
deploy:
  resources:
    limits:
      memory: ${memoryLimit || '1G'}
      cpus: ${cpuLimit ? (Number.parseFloat(cpuLimit) / 1000000000).toString() : '1'}
    reservations:
      memory: ${memoryReservation || '256M'}
      cpus: ${cpuReservation ? (Number.parseFloat(cpuReservation) / 1000000000).toString() : '0.5'}
```

**Rationale**:
- Compose uses different format (strings like "1G" for memory)
- Need conversion from bytes to human-readable for compose.yml
- Consistent with how applications/databases work
- Follows Docker Compose v3 specification

## Risks / Trade-offs

### Risk: Unit Conversion Errors

**Mitigation**:
- Unit tests for all conversion functions
- Validation on both frontend and backend
- Display both user-friendly and raw values in UI (optional tooltip)
- Schema validation with Zod ensures proper ranges

### Risk: User Confusion (Reservation vs Limit)

**Mitigation**:
- Clear labels and tooltips explaining difference
- Reservation = soft limit (can burst), Limit = hard limit (kills container)
- Visual hierarchy in UI (Limit more prominent)
- Documentation with examples

### Risk: Backward Compatibility

**Mitigation**:
- No changes to existing service records
- New fields nullable in settings table
- Conversion functions handle both old and new formats
- Migration is additive only (no data changes)

### Risk: Global Settings Not Found

**Mitigation**:
- Graceful fallback to hardcoded defaults
- Settings creation on first access (upsert pattern)
- Clear error handling in service creation

### Trade-off: Storage Duplication

**Impact**: Settings store MB/cores, services store bytes/nanoseconds
**Justification**: Worth it for clarity and backward compatibility
**Cost**: Negligible (few extra bytes per service)

### Trade-off: Slider Limitations

**Impact**: Power users may want values outside slider ranges
**Justification**: Slider + text input combo addresses this
**Cost**: Slightly more complex UI component

## Migration Plan

### Database Migration

1. Create `settings` table with nullable fields
2. Add resource fields to `compose` table
3. No changes to existing service tables (backward compatible)

```sql
-- Migration up
CREATE TABLE IF NOT EXISTS settings (
  settings_id TEXT PRIMARY KEY,
  global_memory_reservation TEXT,
  global_memory_limit TEXT,
  global_cpu_reservation TEXT,
  global_cpu_limit TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE compose ADD COLUMN IF NOT EXISTS memory_reservation TEXT;
ALTER TABLE compose ADD COLUMN IF NOT EXISTS memory_limit TEXT;
ALTER TABLE compose ADD COLUMN IF NOT EXISTS cpu_reservation TEXT;
ALTER TABLE compose ADD COLUMN IF NOT EXISTS cpu_limit TEXT;
```

```sql
-- Migration down
DROP TABLE IF EXISTS settings;

ALTER TABLE compose DROP COLUMN IF EXISTS memory_reservation;
ALTER TABLE compose DROP COLUMN IF EXISTS memory_limit;
ALTER TABLE compose DROP COLUMN IF EXISTS cpu_reservation;
ALTER TABLE compose DROP COLUMN IF EXISTS cpu_limit;
```

### Deployment Steps

1. **Backend deployment**:
   - Run database migration
   - Deploy updated services with conversion utilities
   - Deploy tRPC endpoints for settings management

2. **Frontend deployment**:
   - Deploy new settings page
   - Deploy updated resource forms with sliders
   - Update navigation to include Resources Limit menu item

3. **Validation**:
   - Verify settings page loads
   - Create test service and confirm defaults apply
   - Check existing services still work
   - Test slider ranges and conversions

### Rollback Plan

1. Revert frontend deployment (removes UI but doesn't break functionality)
2. Revert backend deployment
3. Database rollback:
   - Drop settings table (safe - no foreign keys)
   - Remove compose resource fields (safe - nullable)
   - Existing services unaffected

## Open Questions

1. **Q**: Should we provide preset profiles (e.g., "Development", "Production")?
   **A**: Not in initial implementation. Can be added later as enhancement.

2. **Q**: Should compose services get global defaults automatically?
   **A**: Yes, same as applications/databases for consistency.

3. **Q**: How do we handle updates to global settings - do they affect existing services?
   **A**: No. Global settings only apply at creation time. Existing services maintain their configured limits.

4. **Q**: Should we show a warning if limits are too low/high?
   **A**: Yes - add validation warnings in UI (e.g., "Memory limit below recommended minimum of 256MB").

5. **Q**: What about services created via API without UI?
   **A**: They will receive global defaults automatically unless explicit values provided in API call.
