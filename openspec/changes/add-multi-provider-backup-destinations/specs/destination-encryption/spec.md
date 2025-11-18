# ADDED: End-to-End Encrypted Backup Destinations

## Overview

Support for end-to-end encryption of backups using rclone's crypt remote type. This capability allows users to encrypt their backups before uploading to any storage provider, ensuring that even the storage provider cannot access the backup contents.

## Requirements

#### REQ-ENC-001: Crypt Remote Support
The system MUST support creating "crypt" type destinations that encrypt data before uploading to an underlying storage provider.

#### REQ-ENC-002: Encryption Configuration
When configuring a crypt destination, users MUST be able to specify:
- Base remote (any existing destination)
- Encryption password (master key)
- Salt password (additional security)
- Encryption mode (standard or obfuscation for filenames)

#### REQ-ENC-003: Encryption Transparency
The encryption process MUST be transparent to the backup workflow - encrypted destinations should work exactly like non-encrypted destinations from the user's perspective.

#### REQ-ENC-004: Password Security
The system MUST:
- Never store passwords in plain text
- Encrypt passwords at rest
- Never log passwords
- Warn users that lost passwords cannot be recovered

#### REQ-ENC-005: Encryption Modes
The system MUST support the following encryption modes:
- **Standard**: Encrypt file contents, filenames, and directory names
- **Obfuscation**: Obfuscate filenames only (for compatibility)
- **Off**: File contents encrypted, but names visible (for debugging)

#### REQ-ENC-006: Base Remote Validation
The system MUST validate that the selected base remote:
- Exists and is accessible
- Has write permissions
- Is not itself a crypt remote (no double encryption)

#### REQ-ENC-007: Encryption Warning
When creating a crypt destination, the system MUST display a prominent warning:
"Warning: If you lose your encryption passwords, your backups cannot be recovered. Store these passwords securely in a password manager."

#### REQ-ENC-008: Password Strength
The system SHOULD enforce minimum password strength requirements:
- Minimum 12 characters
- Recommend 16+ characters with special characters
- Show password strength indicator

## Scenarios

#### Scenario: Create Encrypted Google Drive Destination
```gherkin
Given I have a Google Drive destination named "gdrive-raw"
When I navigate to Settings → Backup Destinations
And I click "Add Destination"
And I select "Crypt (Encryption)" as the provider type
And I configure the crypt destination:
  | Field              | Value                    |
  | Name               | Encrypted Google Drive   |
  | Base Remote        | gdrive-raw               |
  | Encryption Password| my-super-secret-pass123! |
  | Salt Password      | my-salt-456!             |
  | Encryption Mode    | Standard                 |
Then I should see a warning about password loss
When I acknowledge the warning
And I click "Test Connection"
Then I should see "Connection successful - Encryption configured"
When I save the destination
Then it should be created with type "crypt"
And backups using this destination should be encrypted
```

#### Scenario: Password Loss Warning
```gherkin
Given I am creating a crypt destination
When I enter the encryption passwords
Then I should see a prominent warning banner:
  "⚠️ Warning: If you lose these passwords, your backups cannot be recovered.
   We recommend storing them in a secure password manager."
And I should see a checkbox "I understand that lost passwords cannot be recovered"
And the "Save" button should be disabled until I check the box
```

#### Scenario: Weak Password Warning
```gherkin
Given I am creating a crypt destination
When I enter "12345" as the encryption password
Then I should see "Weak password" in red
And a strength meter showing "Very Weak"
When I enter "MyS3cure!P@ssw0rd2024"
Then I should see "Strong password" in green
And the strength meter should show "Strong"
```

#### Scenario: Invalid Base Remote
```gherkin
Given I am creating a crypt destination
When I try to select another crypt destination as the base remote
Then I should see an error "Cannot use a crypt remote as base"
And the field should be marked invalid
When I select a non-crypt destination
Then the error should disappear
```

#### Scenario: Encrypted Backup Upload
```gherkin
Given I have a crypt destination configured
And it wraps a Google Drive destination
When I trigger a Postgres backup to the crypt destination
Then the backup should be created locally
And the file should be encrypted using the crypt configuration
And the encrypted file should be uploaded to Google Drive
And the filename on Google Drive should be encrypted/obfuscated
And the local unencrypted file should be deleted
```

#### Scenario: Verify Encryption
```gherkin
Given I have uploaded an encrypted backup to Google Drive via crypt
When I view the file directly in Google Drive
Then the filename should be obfuscated (e.g., "kj3h4k2j3h4k23j4h23")
And the file contents should be binary/encrypted
When I attempt to download and open the file
Then it should not be readable without the decryption password
```

#### Scenario: Test Encrypted Connection
```gherkin
Given I have a crypt destination configured
When I click "Test Connection"
Then the system should:
  - Verify the base remote is accessible
  - Create a test file
  - Encrypt the test file
  - Upload to base remote
  - Download and decrypt to verify
  - Clean up test file
And show "Encryption test successful"
```

#### Scenario: Change Encryption Password
```gherkin
Given I have an existing crypt destination with backups
When I try to change the encryption password
Then I should see a warning:
  "⚠️ Changing the encryption password will only affect new backups.
   Existing backups were encrypted with the old password and cannot be
   re-encrypted automatically."
And I should see options:
  - "Keep old password" (cancel)
  - "Create new destination with new password" (recommended)
  - "Change password (old backups will be inaccessible)"
```

#### Scenario: Display Encrypted vs Non-Encrypted
```gherkin
Given I have both encrypted and non-encrypted destinations
When I view the destinations list
Then encrypted destinations should show:
  - A lock icon 🔒
  - "Encrypted" badge
  - Base remote name in the description
And non-encrypted destinations should not show these indicators
```

#### Scenario: Backup Selection Shows Encryption Status
```gherkin
Given I am configuring a backup for my Postgres database
When I select a destination from the dropdown
Then I should see:
  | Destination Name          | Provider     | Encrypted |
  | AWS S3 Raw                | S3           | No        |
  | Encrypted Google Drive    | Google Drive | Yes (E2EE) |
  | SFTP Server               | SFTP         | No        |
And encrypted destinations should be visually distinct (e.g., with lock icon)
```

#### Scenario: Password Complexity Validation
```gherkin
Given I am creating a crypt destination
When I enter a password shorter than 12 characters
Then I should see "Password must be at least 12 characters"
When I enter a 12-character password with only lowercase letters
Then I should see "Weak: Consider adding uppercase, numbers, and symbols"
When I enter "MyStr0ng!P@ssw0rd"
Then I should see "Strong password" ✓
```

#### Scenario: Salt Password Different from Main Password
```gherkin
Given I am creating a crypt destination
When I enter the same value for both encryption password and salt password
Then I should see a warning "Salt should be different from main password for better security"
But the system should still allow saving (it's a recommendation, not requirement)
```

#### Scenario: Export Encryption Configuration
```gherkin
Given I have a crypt destination configured
When I click "Export Configuration" (admin feature)
Then I should download a JSON file containing:
  - Base remote name
  - Encryption mode
  - Password hints (not actual passwords)
  - rclone config format (for manual recovery)
And I should see a warning to store this securely
```

## Validation Rules

### Crypt Configuration Schema
```typescript
const cryptConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  remote: z.string().min(1, "Base remote is required")
    .refine(
      async (val) => {
        const baseRemote = await getDestination(val);
        return baseRemote.providerType !== "crypt";
      },
      "Base remote cannot be a crypt remote"
    ),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password should contain uppercase letters")
    .regex(/[a-z]/, "Password should contain lowercase letters")
    .regex(/[0-9]/, "Password should contain numbers")
    .regex(/[^A-Za-z0-9]/, "Password should contain special characters"),
  password2: z.string().min(8, "Salt must be at least 8 characters"),
  filename_encryption: z.enum(["standard", "obfuscate", "off"]).default("standard"),
  directory_name_encryption: z.boolean().default(true),
}).refine(
  (data) => data.password !== data.password2,
  "Salt should be different from main password"
);
```

### Password Strength Calculator
```typescript
function calculatePasswordStrength(password: string): {
  score: number; // 0-4
  label: "Very Weak" | "Weak" | "Moderate" | "Strong" | "Very Strong";
  color: string;
} {
  let score = 0;

  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very Weak", "Weak", "Moderate", "Strong", "Very Strong"];
  const colors = ["#ff4444", "#ff8800", "#ffbb00", "#88cc00", "#00cc44"];

  return {
    score: Math.min(score, 4),
    label: labels[score],
    color: colors[score],
  };
}
```

## Data Model

### Crypt Configuration
```typescript
interface CryptConfig {
  remote: string;                    // Base remote name
  password: string;                  // Encrypted encryption password
  password2: string;                 // Encrypted salt password
  filename_encryption: "standard" | "obfuscate" | "off";
  directory_name_encryption: boolean;

  // Metadata
  passwordSetAt: Date;               // For password rotation tracking
  passwordStrength: number;          // Stored strength score
}
```

## UI Components

### Crypt Configuration Form
- **Base Remote Dropdown**: List of all non-crypt destinations
- **Encryption Password Field**:
  - Password input with visibility toggle
  - Strength meter below
  - Generate random password button
- **Salt Password Field**: Similar to encryption password
- **Encryption Mode Radio**: Standard / Obfuscate / Off
- **Directory Encryption Checkbox**: Enabled by default
- **Warning Banner**: Prominent password loss warning
- **Acknowledge Checkbox**: Must check before saving

### Encryption Status Indicators
- **Lock Icon**: 🔒 next to encrypted destinations
- **Badge**: "E2EE" or "Encrypted" badge
- **Base Remote Info**: Shows which remote is encrypted
- **Tooltip**: Hover to see encryption mode and base remote

### Password Strength Meter
- Visual bar showing strength (color-coded)
- Text label (Very Weak → Very Strong)
- Suggestions for improvement

## Security Considerations

### Password Storage
- Passwords encrypted using Dokploy's master encryption key
- Separate encryption from base remote credentials
- Never transmitted to frontend in plain text
- Only decrypted during rclone execution

### Password Recovery
- **No password recovery mechanism** - by design
- Users must store passwords securely
- Recommend password managers
- Optional: Export encrypted backup of config (user's responsibility)

### Encryption Algorithm
- Uses rclone's standard encryption (NaCl SecretBox)
- File content: Encrypted + authenticated
- Filenames: Encrypted (or obfuscated)
- File size obscured by chunking

### Key Derivation
- Password → scrypt → encryption key
- Salt → scrypt → IV generator
- Prevents rainbow table attacks
- Slow derivation (intentional protection)

## Performance Impact

- **Encryption overhead**: ~5-10% slower uploads
- **CPU usage**: Moderate during encryption phase
- **Memory**: Additional buffer for encryption (64MB default)
- **No impact**: On download (decryption happens outside Dokploy)

## Migration & Recovery

### No Automatic Migration
- Cannot automatically re-encrypt existing backups
- Users must manually decrypt and re-upload with new password
- Or create new destination for new backups

### Manual Recovery
- Users can use rclone CLI with stored config
- Export rclone.conf format for offline recovery
- Document manual recovery procedure

## Testing Requirements

- Test encryption/decryption round-trip
- Verify encrypted files are unreadable without password
- Test password validation rules
- Test base remote validation
- Test connection testing with encryption
- Verify cleanup of temporary files
- Test with various base remote types
