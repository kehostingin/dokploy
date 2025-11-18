# MODIFIED: Backup Upload Process

## Overview

Extension of the existing backup upload process to support multiple destination providers via rclone while maintaining backward compatibility with the existing S3 SDK implementation.

## Requirements

#### REQ-BU-001: Dual Upload Path Support
The backup upload process MUST support two upload paths:
- **Legacy**: S3 SDK for existing S3 destinations
- **New**: rclone for all other provider types (including new S3 destinations)

#### REQ-BU-002: Automatic Routing
The system MUST automatically route backup uploads to the appropriate upload mechanism based on the destination's provider type without user intervention.

#### REQ-BU-003: Upload Progress Tracking
For rclone-based uploads, the system MUST:
- Track upload progress (bytes uploaded, percentage complete)
- Display estimated time remaining
- Show current upload speed
- Support cancellation of in-progress uploads

#### REQ-BU-004: Upload Verification
After successful upload, the system MUST verify that:
- The file was uploaded completely
- The file size matches the source
- The file is accessible at the destination
- Checksum validation (when supported by provider)

#### REQ-BU-005: Retry Logic
The system MUST implement retry logic for failed uploads:
- Retry up to 3 times for transient errors
- Use exponential backoff between retries
- Don't retry for permanent errors (authentication, quota exceeded)
- Log all retry attempts

#### REQ-BU-006: Cleanup
After successful upload, the system MUST:
- Delete the temporary local backup file
- Clean up any intermediate files created during upload
- Release file locks and resources

#### REQ-BU-007: Parallel Uploads (Optional)
The system SHOULD support uploading the same backup to multiple destinations in parallel for redundancy.

#### REQ-BU-008: Bandwidth Limiting (Optional)
The system SHOULD allow administrators to configure upload bandwidth limits to prevent network saturation.

## Scenarios

#### Scenario: Upload to S3 Legacy Destination
```gherkin
Given I have an existing S3 destination created before the multi-provider update
When a Postgres backup is triggered
Then the system should detect the destination is type "s3" (legacy)
And use the S3 SDK upload path
And upload the backup file to S3
And verify the upload
And delete the local backup file
And mark the backup as successful
```

#### Scenario: Upload to Google Drive via rclone
```gherkin
Given I have a Google Drive destination configured
When a MySQL backup is triggered
Then the system should:
  - Create the backup file locally
  - Detect the destination is type "google-drive"
  - Generate rclone configuration from stored settings
  - Execute rclone copy command
  - Stream upload progress to UI
  - Verify upload completion
  - Delete local backup file
And I should see the backup file in my Google Drive
```

#### Scenario: Upload with Progress Tracking
```gherkin
Given I am uploading a 500MB backup to SFTP
When the upload starts
Then I should see a progress indicator showing:
  - Bytes uploaded (e.g., "250 MB of 500 MB")
  - Percentage complete (e.g., "50%")
  - Upload speed (e.g., "10 MB/s")
  - Estimated time remaining (e.g., "25 seconds")
And the progress should update in real-time
```

#### Scenario: Upload Retry on Network Error
```gherkin
Given I am uploading a backup to OneDrive
When a network error occurs after 50% upload
Then the system should:
  - Log the error
  - Wait 5 seconds (exponential backoff: 2^1 * 2.5s)
  - Retry the upload from the beginning
  - Resume if the provider supports it
And if the retry succeeds, the backup should be marked successful
```

#### Scenario: Upload Failure After Max Retries
```gherkin
Given I am uploading a backup to an SFTP server
And the server is offline
When the upload fails 3 times
Then the system should:
  - Mark the backup as failed
  - Store the error message
  - Send a notification to the admin
  - Keep the local backup file for manual recovery
And I should see "Backup failed: SFTP server unreachable"
```

#### Scenario: Upload to Encrypted Destination
```gherkin
Given I have a crypt destination wrapping Google Drive
When a Redis backup is triggered to this destination
Then the system should:
  - Create the backup file locally
  - Generate rclone config with crypt settings
  - Encrypt the file via rclone crypt
  - Upload encrypted file to Google Drive
  - Verify upload
  - Delete local unencrypted file
And the file in Google Drive should be encrypted
```

#### Scenario: Parallel Upload to Multiple Destinations
```gherkin
Given I have configured 2 backup destinations:
  - Google Drive (primary)
  - SFTP (secondary)
And I have enabled parallel uploads
When a Postgres backup is triggered
Then the system should:
  - Create one backup file locally
  - Upload to Google Drive in background job 1
  - Upload to SFTP in background job 2
  - Track both uploads independently
  - Mark backup as successful when BOTH complete
And both destinations should have the backup file
```

#### Scenario: Upload Cancellation
```gherkin
Given I am uploading a large backup (2GB) to OneDrive
And the upload is 30% complete
When I click "Cancel Upload"
Then the system should:
  - Send termination signal to rclone process
  - Stop the upload immediately
  - Delete partial remote file if possible
  - Keep local backup file
  - Mark upload as "Cancelled by user"
```

#### Scenario: Quota Exceeded Error
```gherkin
Given I have a Google Drive destination
And my Google Drive storage is full
When a backup upload is attempted
Then the system should:
  - Detect the quota exceeded error from rclone
  - NOT retry the upload
  - Mark backup as failed with clear message
  - Show "Google Drive storage quota exceeded. Please free up space."
And provide a link to Google Drive storage management
```

#### Scenario: Upload Verification Checksum
```gherkin
Given I have uploaded a backup to S3
When the upload completes
Then the system should:
  - Calculate local file checksum (MD5 or SHA256)
  - Retrieve remote file checksum from S3
  - Compare checksums
  - Mark upload as verified if they match
And if checksums don't match, mark as failed and retry
```

#### Scenario: Bandwidth Limiting
```gherkin
Given I have configured upload bandwidth limit to 10 MB/s
When multiple backups are uploading simultaneously
Then each upload should be throttled
And combined upload speed should not exceed 10 MB/s
And I should see "Bandwidth limited to 10 MB/s" in upload status
```

#### Scenario: Resume Interrupted Upload
```gherkin
Given I am uploading a 1GB backup to SFTP
And the upload is interrupted at 600MB
When the system retries
Then rclone should:
  - Check if SFTP supports resume
  - Resume from 600MB if supported
  - Or restart from 0MB if not supported
And the upload should eventually complete
```

#### Scenario: Upload to Custom rclone Destination
```gherkin
Given I have a custom rclone destination (Azure Blob)
When a backup is triggered
Then the system should:
  - Parse the custom rclone config
  - Generate rclone.conf with custom settings
  - Execute rclone with custom remote
  - Upload successfully
```

#### Scenario: Large File Chunked Upload
```gherkin
Given I am uploading a 5GB database backup
And the provider supports chunked uploads
When the upload starts
Then rclone should:
  - Split the file into chunks (e.g., 64MB each)
  - Upload chunks in parallel (4 streams)
  - Reassemble on the remote
And the upload should be faster than single-stream
```

#### Scenario: Upload Logging
```gherkin
Given a backup upload is in progress
When I view the backup logs
Then I should see:
  - Upload start time
  - Destination provider and name
  - File size
  - rclone command executed (sanitized, no credentials)
  - Upload progress updates
  - Upload completion time and speed
  - Any errors or retries
And logs should not contain sensitive credentials
```

## Upload Flow Diagram

```
┌─────────────────────────────────────┐
│ Trigger Backup                      │
│ (Postgres/MySQL/Mongo/Redis/etc.)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Create Backup File Locally          │
│ /tmp/backup-{timestamp}.sql.gz     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Get Destination Configuration       │
│ destinationType = ?                 │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────────┐  ┌─────────────────┐
│ Type: s3    │  │ Type: other     │
│ (legacy)    │  │ (rclone)        │
└──────┬──────┘  └────────┬────────┘
       │                  │
       ▼                  ▼
┌─────────────┐  ┌──────────────────────┐
│ Upload via  │  │ Generate rclone      │
│ S3 SDK      │  │ Config from DB       │
└──────┬──────┘  └────────┬─────────────┘
       │                  │
       │                  ▼
       │         ┌──────────────────────┐
       │         │ Execute rclone copy  │
       │         │ with progress stream │
       │         └────────┬─────────────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────────┐
│ Verify Upload                       │
│ - File exists                       │
│ - Size matches                      │
│ - Checksum (if available)           │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │ Success │   │ Failure │
   └────┬────┘   └────┬────┘
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Delete Local │  │ Keep Local   │
│ Backup File  │  │ for Recovery │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Mark Success │  │ Retry Logic  │
│ in Database  │  │ (max 3 times)│
└──────────────┘  └──────────────┘
```

## Implementation Details

### Upload Router
```typescript
async function uploadBackup(
  backupFile: string,
  destinationId: string
): Promise<UploadResult> {
  const destination = await getDestination(destinationId);

  if (destination.providerType === "s3" && !destination.rcloneConfig) {
    // Legacy S3 path
    return await uploadViaS3SDK(backupFile, destination);
  } else {
    // rclone path (all other providers + new S3)
    return await uploadViaRclone(backupFile, destination);
  }
}
```

### rclone Upload Function
```typescript
async function uploadViaRclone(
  backupFile: string,
  destination: Destination
): Promise<UploadResult> {
  // 1. Generate rclone config
  const rcloneConfig = generateRcloneConfig(destination);

  // 2. Execute rclone copy with progress tracking
  const result = await executeRclone({
    command: "copy",
    source: backupFile,
    destination: `${destination.name}:backups/${path.basename(backupFile)}`,
    config: rcloneConfig,
    onProgress: (progress) => {
      // Emit progress event for real-time updates
      emitUploadProgress(destination.id, progress);
    },
  });

  // 3. Verify upload
  if (result.exitCode === 0) {
    const verified = await verifyRcloneUpload(destination, backupFile);
    if (verified) {
      return { success: true, size: result.bytesUploaded };
    }
  }

  // 4. Handle errors
  throw new UploadError(result.error, result.exitCode);
}
```

### Progress Tracking
```typescript
interface UploadProgress {
  destinationId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  speedBytesPerSecond: number;
  estimatedSecondsRemaining: number;
  status: "uploading" | "verifying" | "complete" | "failed";
}

function parseRcloneProgress(output: string): UploadProgress {
  // Parse rclone JSON output (--stats-one-line-date --stats 1s --json)
  const stats = JSON.parse(output);

  return {
    uploadedBytes: stats.bytes,
    totalBytes: stats.totalBytes,
    percentage: (stats.bytes / stats.totalBytes) * 100,
    speedBytesPerSecond: stats.speed,
    estimatedSecondsRemaining: stats.eta,
    status: "uploading",
  };
}
```

### Retry Logic
```typescript
async function uploadWithRetry(
  backupFile: string,
  destination: Destination,
  maxRetries: number = 3
): Promise<UploadResult> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadViaRclone(backupFile, destination);
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry permanent errors
      if (isPermanentError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt * 2.5 seconds
        const delayMs = Math.pow(2, attempt) * 2500;
        await sleep(delayMs);

        logger.info(`Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms`);
      }
    }
  }

  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

function isPermanentError(error: Error): boolean {
  const permanentErrors = [
    "authentication failed",
    "quota exceeded",
    "access denied",
    "invalid credentials",
  ];

  return permanentErrors.some((msg) =>
    error.message.toLowerCase().includes(msg)
  );
}
```

### Verification
```typescript
async function verifyRcloneUpload(
  destination: Destination,
  localFile: string
): Promise<boolean> {
  const remotePath = `${destination.name}:backups/${path.basename(localFile)}`;

  // Check if file exists
  const lsResult = await executeRclone({
    command: "lsf",
    args: [remotePath],
  });

  if (lsResult.exitCode !== 0) {
    return false;
  }

  // Check file size matches
  const localSize = fs.statSync(localFile).size;
  const remoteSize = await getRcloneFileSize(remotePath);

  if (localSize !== remoteSize) {
    logger.error(`Size mismatch: local=${localSize}, remote=${remoteSize}`);
    return false;
  }

  // Optional: Checksum validation (if provider supports it)
  if (supportsChecksums(destination.providerType)) {
    const localChecksum = await calculateChecksum(localFile);
    const remoteChecksum = await getRcloneChecksum(remotePath);
    return localChecksum === remoteChecksum;
  }

  return true;
}
```

## Performance Optimizations

### rclone Parameters
```typescript
const rcloneOptimizations = {
  transfers: 4,              // Parallel file transfers
  checkers: 8,              // Parallel file checkers
  bufferSize: "64M",        // Upload buffer size
  useServerModtime: true,   // Trust server's modification time
  noCheckDest: false,       // Always verify destination
  noTraverse: false,        // Don't skip directory traversal
  fastList: true,           // Use faster listing (if supported)
};
```

### Chunked Uploads
- Use rclone's built-in chunking for large files
- Configure chunk size based on provider (e.g., 64MB for Google Drive)
- Enable parallel chunk uploads when supported

### Bandwidth Management
```typescript
const bandwidthConfig = {
  bwlimit: "10M",           // Limit to 10 MB/s
  bwlimitFile: "5M",        // Per-file limit
  tpsLimit: 10,             // Transactions per second limit
};
```

## Error Handling

### rclone Exit Codes
```typescript
const rcloneExitCodes = {
  0: "Success",
  1: "Syntax or usage error",
  2: "Error not otherwise categorized",
  3: "Directory not found",
  4: "File not found",
  5: "Temporary error (retry)",
  6: "Less serious errors",
  7: "Fatal error",
  8: "Transfer exceeded (quota, size limits)",
  9: "Operation forbidden",
};

function shouldRetry(exitCode: number): boolean {
  return exitCode === 5; // Temporary error
}
```

### User-Friendly Error Messages
```typescript
const errorMessages = {
  "Failed to copy": "Upload failed. Please check your network connection.",
  "Quota exceeded": "Storage quota exceeded. Please free up space or upgrade your plan.",
  "Authentication failed": "Authentication failed. Please re-authorize this destination.",
  "NoSuchBucket": "Destination bucket not found. Please check configuration.",
  "Access Denied": "Access denied. Please check destination permissions.",
};
```

## Monitoring & Logging

### Metrics to Track
- Upload success rate per provider
- Average upload time per provider
- Upload failures by error type
- Retry frequency
- Bandwidth usage

### Log Format
```
[2024-01-18 10:30:00] INFO: Upload started - destination=gdrive-backup, file=postgres-20240118-103000.sql.gz, size=250MB
[2024-01-18 10:30:05] INFO: Upload progress - 25% (62.5MB/250MB), speed=12.5MB/s, eta=15s
[2024-01-18 10:30:10] INFO: Upload progress - 50% (125MB/250MB), speed=12.5MB/s, eta=10s
[2024-01-18 10:30:15] INFO: Upload progress - 75% (187.5MB/250MB), speed=12.5MB/s, eta=5s
[2024-01-18 10:30:20] INFO: Upload complete - duration=20s, average_speed=12.5MB/s
[2024-01-18 10:30:21] INFO: Verification successful - remote_size=250MB
[2024-01-18 10:30:22] INFO: Local file deleted - /tmp/postgres-20240118-103000.sql.gz
```

## Testing Requirements

- Test upload to each provider type
- Test upload retry logic
- Test progress tracking accuracy
- Test verification logic
- Test bandwidth limiting
- Test concurrent uploads
- Test upload cancellation
- Test error scenarios (network, quota, auth)
- Test legacy S3 path still works
- Performance testing with various file sizes
