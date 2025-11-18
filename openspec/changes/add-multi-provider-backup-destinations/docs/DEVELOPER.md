# Developer Documentation: Multi-Provider Backup Destinations

This document covers the architecture, implementation details, and how to extend the multi-provider backup system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Destination Form │  │ OAuth Callback │  │ List/Manage │ │
│  └──────────────────┘  └────────────────┘  └─────────────┘ │
└────────────────────────────────┬────────────────────────────┘
                                 │ tRPC API
┌────────────────────────────────┴────────────────────────────┐
│                      Backend (Node.js)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Destination      │  │ OAuth            │  │ Backup    │ │
│  │ Service          │  │ Service          │  │ Service   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘ │
│           │                     │                    │       │
│  ┌────────┴─────────┐  ┌────────┴────────┐  ┌─────┴─────┐ │
│  │ rclone           │  │ OAuth Session   │  │ Encryption│ │
│  │ Service          │  │ Management      │  │ Utils     │ │
│  └────────┬─────────┘  └─────────────────┘  └───────────┘ │
└───────────┴──────────────────────────────────────────────────┘
            │
┌───────────┴──────────────────────────────────────────────────┐
│                    External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ rclone   │  │ Google   │  │ OneDrive │  │ SFTP     │    │
│  │ CLI      │  │ Drive    │  │ API      │  │ Server   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Database Schema

**File**: `packages/server/src/db/schema/destination.ts`

```typescript
export const destinations = pgTable("destination", {
  destinationId: text("destinationId").primaryKey(),
  name: text("name").notNull(),

  // Multi-provider support
  providerType: text("provider_type").default("s3"),
  rcloneConfig: text("rclone_config"), // Encrypted JSON
  customConfig: text("custom_config"),
  lastTestedAt: timestamp("last_tested_at"),
  lastError: text("last_error"),

  // Legacy S3 fields (backward compatibility)
  provider: text("provider"),
  accessKey: text("accessKey"),
  secretAccessKey: text("secretAccessKey"),
  bucket: text("bucket"),
  region: text("region"),
  endpoint: text("endpoint"),

  organizationId: text("organizationId").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

### 2. Provider System

**File**: `packages/server/src/services/rclone/rclone-providers.ts`

Defines metadata and validation for each provider:

```typescript
export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  requiresOAuth: boolean;
  supportsEncryption: boolean;
  configSchema: z.ZodSchema;
  rcloneType: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  // 10 provider definitions
];
```

### 3. rclone Integration

**File**: `packages/server/src/services/rclone/rclone-config.ts`

Generates rclone configuration from provider configs:

```typescript
export function generateRcloneConfig(
  remoteName: string,
  providerType: string,
  config: Record<string, any>
): string {
  // Generates [remote-name] config section
}
```

**File**: `packages/server/src/services/rclone/rclone-executor.ts`

Executes rclone commands:

```typescript
export async function executeRcloneCommand(
  command: string[],
  options?: ExecuteOptions
): Promise<RcloneResult>
```

### 4. OAuth Flow

**Architecture**:
1. **Initiate** → Create session, generate auth URL
2. **Redirect** → User authorizes on provider site
3. **Callback** → Exchange code for tokens, store in session
4. **Poll** → Frontend polls for token availability
5. **Create** → Use tokens to create destination

**Files**:
- `packages/server/src/services/oauth/oauth-session.ts` - Session management
- `packages/server/src/services/oauth/oauth-google-drive.ts` - Google Drive OAuth
- `packages/server/src/services/oauth/oauth-onedrive.ts` - OneDrive OAuth
- `packages/server/src/services/oauth/oauth-dropbox.ts` - Dropbox OAuth
- `apps/dokploy/server/api/routers/oauth.ts` - tRPC endpoints
- `apps/dokploy/pages/oauth/callback.tsx` - Callback page

### 5. Encryption

**File**: `packages/server/src/utils/encryption.ts`

```typescript
export function encrypt(plaintext: string): string
export function decrypt(ciphertext: string): string
```

Uses AES-256-GCM with scrypt key derivation.
Requires `DOKPLOY_ENCRYPTION_SECRET` environment variable.

## Adding a New Provider

Follow these steps to add a new backup provider:

### Step 1: Add Provider Definition

**File**: `packages/server/src/services/rclone/rclone-providers.ts`

```typescript
{
  id: "new-provider",
  name: "New Provider",
  description: "Description of the provider",
  requiresOAuth: false, // or true if OAuth needed
  supportsEncryption: true,
  configSchema: z.object({
    // Define required fields
    apiKey: z.string().min(1),
    region: z.string().optional(),
  }),
  rcloneType: "s3", // rclone type name
}
```

### Step 2: Add to Provider Type Enum

**File**: `packages/server/src/db/schema/destination.ts`

```typescript
export const providerTypeSchema = z.enum([
  "s3",
  "google-drive",
  // ... existing providers
  "new-provider", // Add here
]);
```

### Step 3: Implement rclone Config Generation

**File**: `packages/server/src/services/rclone/rclone-config.ts`

```typescript
case "new-provider":
  configLines.push(`type = ${provider.rcloneType}`);
  configLines.push(`api_key = ${config.apiKey}`);
  if (config.region) {
    configLines.push(`region = ${config.region}`);
  }
  break;
```

### Step 4: Add UI Form Fields

**File**: `apps/dokploy/components/dashboard/settings/destination/handle-destinations-v2.tsx`

```typescript
// Add to PROVIDER_INFO
"new-provider": {
  icon: <Icon className="size-4" />,
  name: "New Provider",
  description: "Provider description",
},

// Add form fields
{selectedProvider === "new-provider" && (
  <>
    <FormField
      control={form.control}
      name="apiKey"
      render={({ field }) => (
        <FormItem>
          <FormLabel>API Key</FormLabel>
          <FormControl>
            <Input type="password" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)}

// Add to onSubmit handler
else if (data.providerType === "new-provider") {
  rcloneConfig = {
    apiKey: data.apiKey,
    region: data.region,
  };
  await mutateAsync({
    name: data.name,
    providerType: "new-provider",
    rcloneConfig: JSON.stringify(rcloneConfig),
    destinationId: destinationId || "",
  });
}
```

### Step 5: Add Tests

**File**: `apps/dokploy/__test__/services/rclone/rclone-config.test.ts`

```typescript
describe("New Provider", () => {
  test("should generate config for new-provider", () => {
    const config = generateRcloneConfig(
      "my-remote",
      "new-provider",
      { apiKey: "test-key", region: "us-east-1" }
    );

    expect(config).toContain("[my-remote]");
    expect(config).toContain("type = s3");
    expect(config).toContain("api_key = test-key");
  });
});
```

### Step 6: Update Documentation

Create setup guide at:
`openspec/changes/add-multi-provider-backup-destinations/docs/new-provider-setup.md`

## Adding OAuth Provider

For OAuth providers (like Dropbox, Box, etc.), additional steps:

### Step 1: Create OAuth Service

**File**: `packages/server/src/services/oauth/oauth-new-provider.ts`

```typescript
export interface NewProviderOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export const getNewProviderOAuthConfig = (): NewProviderOAuthConfig => {
  const clientId = process.env.NEW_PROVIDER_CLIENT_ID;
  const clientSecret = process.env.NEW_PROVIDER_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("OAuth not configured");
  }

  return { clientId, clientSecret, redirectUri };
};

export const getNewProviderAuthUrl = (session: OAuthSession): string => {
  const config = getNewProviderOAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: session.state,
  });

  return `https://provider.com/oauth/authorize?${params.toString()}`;
};

export const exchangeNewProviderCode = async (
  code: string
): Promise<TokenResponse> => {
  // Exchange authorization code for access token
};

export const getNewProviderUserInfo = async (
  accessToken: string
): Promise<UserInfo> => {
  // Get user info from provider API
};
```

### Step 2: Update OAuth Router

**File**: `apps/dokploy/server/api/routers/oauth.ts`

Add cases for new provider in `initiate` and `callback` mutations.

### Step 3: Add OAuth UI

**File**: `apps/dokploy/components/dashboard/settings/destination/handle-destinations-v2.tsx`

Add provider to OAuth section with authorization button and status display.

## Testing

### Unit Tests
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test oauth-session.test.ts

# Watch mode
pnpm test --watch
```

### Integration Testing

1. Set up test environment variables
2. Create test destination
3. Run connection test
4. Verify backup upload

### Manual Testing Checklist

- [ ] Create destination via UI
- [ ] Test connection
- [ ] Run backup
- [ ] Verify files uploaded
- [ ] Edit destination
- [ ] Delete destination

## API Documentation

### tRPC Endpoints

**Destination Router** (`/api/trpc/destination.*`):
- `destination.create` - Create new destination
- `destination.update` - Update existing destination
- `destination.remove` - Delete destination
- `destination.one` - Get single destination
- `destination.all` - List all destinations
- `destination.testConnection` - Test connection
- `destination.getProviders` - List supported providers
- `destination.getProviderSchema` - Get provider config schema

**OAuth Router** (`/api/trpc/oauth.*`):
- `oauth.initiate` - Start OAuth flow
- `oauth.callback` - Handle OAuth callback
- `oauth.getSession` - Get session status
- `oauth.getTokenData` - Get token data for destination
- `oauth.deleteSession` - Clean up session
- `oauth.getConfigStatus` - Check OAuth configuration

## Environment Variables

### Required
- `DOKPLOY_ENCRYPTION_SECRET` - Encryption key (32+ characters)

### OAuth (Optional, per provider)
- `GOOGLE_DRIVE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_DRIVE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_DRIVE_REDIRECT_URI` - Override redirect URI (optional)
- `ONEDRIVE_CLIENT_ID` - Microsoft OAuth client ID
- `ONEDRIVE_CLIENT_SECRET` - Microsoft OAuth client secret
- `ONEDRIVE_REDIRECT_URI` - Override redirect URI (optional)
- `DROPBOX_CLIENT_ID` - Dropbox OAuth client ID
- `DROPBOX_CLIENT_SECRET` - Dropbox OAuth client secret
- `DROPBOX_REDIRECT_URI` - Override redirect URI (optional)

### Runtime
- `NEXT_PUBLIC_APP_URL` - Base URL for OAuth callbacks

## Security Considerations

### Encryption
- All sensitive config data encrypted with AES-256-GCM
- IV randomized for each encryption
- Authenticated encryption prevents tampering

### OAuth
- CSRF protection via state parameter
- Session expiration (10 minutes)
- Secure token storage (encrypted in database)
- HTTPS required for OAuth callbacks

### API
- Admin-only endpoints (role-based access control)
- Organization-scoped data access
- Input validation with Zod schemas

## Performance

### rclone Optimization
- Streaming uploads (no temp files)
- Concurrent transfers
- Automatic retry logic
- Progress tracking

### Database
- Indexed queries on `organizationId` and `providerType`
- Encrypted configs cached during request
- Connection pooling

## Troubleshooting

### Common Issues

**"Encryption not configured"**
- Set `DOKPLOY_ENCRYPTION_SECRET` environment variable
- Restart application

**"OAuth not configured"**
- Set provider-specific CLIENT_ID and CLIENT_SECRET
- Restart application

**"rclone command failed"**
- Check rclone is installed: `which rclone`
- Verify rclone version: `rclone version`
- Check rclone logs for details

## Migration Guide

See [MIGRATION.md](./MIGRATION.md) for:
- Upgrading from S3-only to multi-provider
- Backward compatibility
- Data migration steps

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Test with real providers
5. Submit PR with clear description

## Resources

- [rclone Documentation](https://rclone.org/docs/)
- [Google Drive API](https://developers.google.com/drive/api)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/overview)
- [Dropbox API](https://www.dropbox.com/developers/documentation)
