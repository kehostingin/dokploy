# ADDED: Multi-Provider Backup Destinations

## Overview

Support for multiple backup destination providers beyond S3, including Google Drive, OneDrive, FTP, SFTP, and custom rclone configurations. This capability enables users to choose their preferred storage provider for database and application backups.

## Requirements

#### REQ-BD-001: Multiple Provider Support
The system MUST support the following backup destination providers:
- Google Drive (OAuth2 authentication)
- OneDrive (OAuth2 authentication)
- FTP/FTPS (username/password authentication)
- SFTP (SSH key or password authentication)
- S3-compatible storage (backward compatibility)
- Dropbox (OAuth2 authentication, optional)
- WebDAV (username/password authentication, optional)
- Custom rclone configuration (for any rclone-supported provider)

#### REQ-BD-002: Menu Renaming
The system MUST rename the "S3 Destinations" menu item to "Backup Destinations" in the Settings navigation.

#### REQ-BD-003: Provider Selection
When creating a new backup destination, users MUST be able to select the provider type from a list of supported providers.

#### REQ-BD-004: Provider-Specific Configuration
The system MUST present provider-specific configuration forms based on the selected provider type, including appropriate fields for:
- OAuth2 flow initiation for cloud providers (Google Drive, OneDrive, Dropbox)
- Hostname, port, credentials for server-based providers (FTP, SFTP)
- Custom rclone configuration snippet for advanced users

#### REQ-BD-005: Connection Testing
The system MUST provide a "Test Connection" function that validates the destination configuration before saving, including:
- Connectivity verification
- Authentication validation
- Permission checks (read/write access)
- Clear error messages for failures

#### REQ-BD-006: Backward Compatibility
The system MUST maintain full backward compatibility with existing S3 destinations:
- Existing S3 destinations continue to work without modification
- S3 SDK upload path remains available
- No breaking changes to backup APIs

#### REQ-BD-007: OAuth Token Management
For OAuth2-based providers, the system MUST:
- Securely store OAuth tokens with encryption
- Automatically refresh expired tokens
- Notify users when token refresh fails
- Provide manual re-authorization flow

#### REQ-BD-008: Custom Configuration Support
The system MUST allow advanced users to provide custom rclone configuration snippets to support any rclone-compatible provider not explicitly listed.

## Scenarios

#### Scenario: Create Google Drive Destination
```gherkin
Given I am an admin user
When I navigate to Settings → Backup Destinations
And I click "Add Destination"
And I select "Google Drive" as the provider type
And I click "Authorize with Google"
Then I should see a Google OAuth consent screen
When I authorize the application
Then I should return to the configuration form
And I should see "Successfully authorized as [email]"
When I click "Test Connection"
Then I should see "Connection successful"
When I click "Save"
Then the destination should be created
And I should see it in the destinations list with "Google Drive" badge
```

#### Scenario: Create SFTP Destination
```gherkin
Given I am an admin user
When I navigate to Settings → Backup Destinations
And I click "Add Destination"
And I select "SFTP" as the provider type
And I enter the following configuration:
  | Field    | Value               |
  | Name     | My SFTP Server      |
  | Host     | sftp.example.com    |
  | Port     | 22                  |
  | Username | backupuser          |
  | Password | mypassword          |
And I click "Test Connection"
Then I should see "Connection successful"
When I click "Save"
Then the destination should be created
```

#### Scenario: OAuth Token Expired
```gherkin
Given I have a Google Drive destination configured
And the OAuth token has expired
When a backup is triggered to that destination
Then the upload should fail
And I should see an error "OAuth token expired"
When I click "Re-authorize" on the destination
Then I should see the Google OAuth consent screen
When I authorize the application
Then the token should be refreshed
And subsequent backups should succeed
```

#### Scenario: Test Connection Failure
```gherkin
Given I am configuring a new SFTP destination
And I enter incorrect credentials
When I click "Test Connection"
Then I should see "Connection failed: Authentication error"
And the "Save" button should be disabled
When I correct the credentials
And I click "Test Connection" again
Then I should see "Connection successful"
And the "Save" button should be enabled
```

#### Scenario: Use Custom rclone Config
```gherkin
Given I am an advanced user
When I select "Custom" as the provider type
And I paste a valid rclone configuration snippet:
  """
  [azureblob_backup]
  type = azureblob
  account = myaccount
  key = mykey
  """
And I click "Test Connection"
Then the system should validate the configuration
And I should see "Connection successful"
When I save the destination
Then it should be available for backups
```

#### Scenario: Menu Renamed
```gherkin
Given I am viewing the Settings menu
Then I should see "Backup Destinations" menu item
And I should NOT see "S3 Destinations" menu item
When I click "Backup Destinations"
Then I should see the destinations management page
```

#### Scenario: Provider Type Badge
```gherkin
Given I have multiple destinations configured:
  | Name           | Provider     |
  | AWS Backup     | S3           |
  | Google Backup  | Google Drive |
  | SFTP Backup    | SFTP         |
When I view the destinations list
Then each destination should display a badge with its provider type
And each badge should have an appropriate icon/logo
```

#### Scenario: Filter by Provider Type
```gherkin
Given I have 10 destinations of various types
When I click the provider filter dropdown
Then I should see all available provider types
When I select "Google Drive"
Then I should only see Google Drive destinations
When I clear the filter
Then I should see all destinations again
```

#### Scenario: Multiple Destinations Per Provider
```gherkin
Given I want to use multiple Google Drive accounts
When I create a Google Drive destination for account A
And I create another Google Drive destination for account B
Then both destinations should work independently
And backups can be sent to either destination
```

#### Scenario: Edit Destination Configuration
```gherkin
Given I have an existing SFTP destination
When I click "Edit" on the destination
Then I should see the configuration form pre-filled
When I change the password
And I click "Test Connection"
Then the connection should be tested with new credentials
When I save the changes
Then the destination should be updated
And future backups should use the new configuration
```

#### Scenario: Delete Destination with Warning
```gherkin
Given I have a destination that is being used by backups
When I try to delete the destination
Then I should see a warning message
  "This destination is used by [N] backup configurations. Deleting it will affect these backups."
When I confirm the deletion
Then the destination should be deleted
And affected backup configurations should be updated
```

#### Scenario: Connection Test Shows Details
```gherkin
Given I am testing a connection to Google Drive
When I click "Test Connection"
Then I should see a progress indicator
And upon success, I should see:
  - "Connection successful"
  - Available storage space
  - Upload/download speed estimate
  - Root folder path confirmation
```

#### Scenario: OAuth Flow in Popup
```gherkin
Given I am authorizing Google Drive
When I click "Authorize with Google"
Then a popup window should open
And I should see the Google OAuth consent screen in the popup
When I authorize in the popup
Then the popup should close automatically
And the main window should show "Successfully authorized"
```

#### Scenario: Offline Provider Detection
```gherkin
Given I have an SFTP destination configured
And the SFTP server is offline
When I click "Test Connection"
Then I should see "Connection failed: Host unreachable"
And the error should include troubleshooting hints
```

## Validation Rules

### Provider Type Validation
```typescript
const providerTypeSchema = z.enum([
  "s3",
  "google-drive",
  "onedrive",
  "dropbox",
  "ftp",
  "sftp",
  "webdav",
  "local",
  "crypt",
  "custom",
]);
```

### Google Drive Configuration
```typescript
const googleDriveConfigSchema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client secret is required"),
  token: z.string().min(1, "OAuth token is required"),
  root_folder_id: z.string().optional(),
  team_drive: z.string().optional(),
});
```

### SFTP Configuration
```typescript
const sftpConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535).default(22),
  user: z.string().min(1, "Username is required"),
  password: z.string().min(1).optional(),
  key_file: z.string().optional(),
  use_insecure_cipher: z.boolean().default(false),
}).refine(
  (data) => data.password || data.key_file,
  "Either password or SSH key is required"
);
```

### FTP Configuration
```typescript
const ftpConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535).default(21),
  user: z.string().min(1, "Username is required"),
  pass: z.string().min(1, "Password is required"),
  tls: z.boolean().default(false),
  explicit_tls: z.boolean().default(false),
});
```

### Custom Config Validation
```typescript
const customConfigSchema = z.object({
  config: z.string()
    .min(10, "Configuration too short")
    .refine(
      (val) => val.includes("type ="),
      "Configuration must include 'type' field"
    ),
});
```

## Data Model

### Destination Table Extension
```typescript
interface Destination {
  destinationId: string;
  name: string;
  providerType: ProviderType;

  // Encrypted JSON configuration (provider-specific)
  rcloneConfig?: string;

  // Custom rclone snippet (for advanced users)
  customConfig?: string;

  // Legacy S3 fields (for backward compatibility)
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;

  // Metadata
  isActive: boolean;
  lastTestedAt?: Date;
  lastUsedAt?: Date;
  lastError?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### OAuth Session
```typescript
interface OAuthSession {
  sessionId: string;
  providerType: "google-drive" | "onedrive" | "dropbox";
  userId: string;
  authUrl: string;
  token?: string;
  expiresAt: Date;
  createdAt: Date;
}
```

## UI Components

### Provider Selection
- Dropdown or grid of provider cards
- Each provider shows:
  - Logo/icon
  - Name
  - Brief description
  - "OAuth Required" badge if applicable

### Configuration Forms
- Dynamic form based on selected provider
- Google Drive: OAuth button + optional settings
- SFTP: Host, port, username, password/key
- FTP: Host, port, username, password, TLS options
- Custom: Textarea for rclone config snippet

### Connection Testing
- "Test Connection" button
- Loading spinner during test
- Success: Green checkmark + details
- Failure: Red X + error message + troubleshooting hints

### Destinations List
- Table or cards showing all destinations
- Columns: Name, Provider (badge), Status, Last Tested, Actions
- Actions: Edit, Test, Delete
- Filter by provider type
- Search by name

## Error Handling

### OAuth Errors
- Token expired → Show "Re-authorize" button
- Authorization denied → Show clear message
- Network error → Show retry option

### Connection Errors
- Host unreachable → "Check hostname and firewall settings"
- Authentication failed → "Check username and password"
- Permission denied → "Ensure user has write access to destination"
- Quota exceeded → "Storage quota exceeded, upgrade plan or clean up old backups"

## Performance Considerations

- OAuth token refresh should happen asynchronously
- Connection tests should timeout after 30 seconds
- Large uploads should show progress
- Support for concurrent uploads to multiple destinations

## Security Requirements

- All OAuth tokens encrypted at rest
- All passwords/keys encrypted at rest
- OAuth callbacks must use HTTPS
- Rate limiting on OAuth endpoints
- Audit log for destination changes
- No credentials in logs or error messages
