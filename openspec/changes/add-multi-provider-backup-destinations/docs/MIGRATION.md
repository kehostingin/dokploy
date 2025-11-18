# Migration Guide: Multi-Provider Backup Destinations

This guide covers migrating from the legacy S3-only backup system to the new multi-provider system.

## Backward Compatibility

**Good news**: Existing S3 destinations continue to work without any changes!

The new system is **100% backward compatible** with existing S3 configurations. No migration is required unless you want to use new provider features.

## What's Changed

### Database Schema
New columns added to `destination` table:
- `provider_type` - Provider identifier (defaults to "s3")
- `rclone_config` - Encrypted provider configuration
- `custom_config` - Custom rclone configuration
- `last_tested_at` - Last connection test timestamp
- `last_error` - Last error message

Existing S3 fields remain unchanged:
- `provider` - S3 provider (AWS, MinIO, etc.)
- `accessKey` - S3 access key
- `secretAccessKey` - S3 secret key
- `bucket` - S3 bucket name
- `region` - S3 region
- `endpoint` - S3 endpoint URL

### API Changes
- **No breaking changes** to existing endpoints
- New endpoints added for OAuth and provider metadata
- Existing `destination.create` accepts both old and new formats

### UI Changes
- "S3 Destinations" renamed to "Backup Destinations"
- New provider selection dropdown
- Existing S3 destinations display correctly
- Connection testing added

## Migration Scenarios

### Scenario 1: Keep Using S3 (No Action Required)

If you're happy with S3, **do nothing**! Your existing destinations work exactly as before.

### Scenario 2: Add New Provider Types

Simply create new destinations alongside existing S3 ones:

1. Go to **Settings** → **Backup Destinations**
2. Click **"Add Destination"**
3. Select new provider (Google Drive, SFTP, etc.)
4. Configure and authorize
5. Existing S3 destinations remain unchanged

### Scenario 3: Migrate S3 to Another Provider

To switch from S3 to another provider:

1. **Create new destination** with desired provider
2. **Test the connection** to verify it works
3. **Update backup configurations** to use new destination:
   - Go to each database/app backup settings
   - Change destination dropdown to new provider
   - Save configuration
4. **Optional**: Delete old S3 destination after confirming backups work
5. **Optional**: Migrate existing backup files (manual process)

### Scenario 4: Use Multiple Providers

You can use different providers for different services:

```
PostgreSQL DB → Google Drive (large storage)
MySQL DB → SFTP (local backup)
MongoDB → S3 (existing setup)
Redis → OneDrive (redundancy)
```

## Data Migration

### Migrating Backup Files

If you want to move existing backups from S3 to another provider:

**Option 1: Manual rclone sync**
```bash
# Configure both remotes in rclone
rclone config

# Sync from S3 to new provider
rclone sync s3-remote:bucket/path new-remote:/path
```

**Option 2: Download and re-upload**
```bash
# Download from S3
aws s3 sync s3://bucket/backups ./local-backups

# Upload to new destination via rclone
rclone copy ./local-backups new-remote:/backups
```

**Option 3: Keep backups in both places**
- Create destinations for both S3 and new provider
- Configure future backups to use new provider
- Keep old S3 backups for retention period
- Eventually phase out S3

## Environment Variables

### New Required Variable
```bash
DOKPLOY_ENCRYPTION_SECRET=your-secret-key-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

**Important**: Set this before creating any new-style destinations. Without it, destinations using `rcloneConfig` cannot be created.

### OAuth Provider Variables (Optional)
Only needed if using OAuth providers:

```bash
# Google Drive
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret

# OneDrive
ONEDRIVE_CLIENT_ID=your-client-id
ONEDRIVE_CLIENT_SECRET=your-client-secret

# Dropbox
DROPBOX_CLIENT_ID=your-client-id
DROPBOX_CLIENT_SECRET=your-client-secret
```

## Breaking Changes

### None!

There are **no breaking changes** in this release. All existing functionality remains intact.

### Deprecation Notice

While legacy S3 fields are not deprecated, we recommend:
- New S3 destinations use the new `rcloneConfig` format (more flexible)
- Existing S3 destinations can stay as-is or be recreated using new format

## Database Migration

The database migration (`0122_add_multi_provider_destinations.sql`) automatically:
1. Adds new columns with defaults
2. Sets `provider_type = 's3'` for existing destinations
3. Leaves existing S3 fields intact
4. Adds indexes for performance

### Running the Migration

Migrations run automatically on Dokploy startup. To run manually:

```bash
# Using drizzle-kit
pnpm --filter dokploy db:migrate

# Or via Docker
docker exec dokploy npm run db:migrate
```

### Rollback

If needed, rollback by:
1. Restore database from backup
2. Deploy previous Dokploy version
3. Report the issue on GitHub

## Testing After Migration

1. **Verify existing S3 destinations**:
   - Go to Backup Destinations
   - Click "Test Connection" on each S3 destination
   - Confirm all tests pass

2. **Test backup creation**:
   - Trigger manual backup on a test database
   - Verify backup appears in S3
   - Check backup file integrity

3. **Test new providers**:
   - Create test destination with new provider
   - Test connection
   - Run test backup
   - Verify files uploaded correctly

## Troubleshooting

### "Column provider_type does not exist"
- Database migration didn't run
- Restart Dokploy to trigger migration
- Or run migration manually (see above)

### "Encryption not configured"
- Set `DOKPLOY_ENCRYPTION_SECRET` environment variable
- Restart Dokploy
- **Note**: Only needed for new-style destinations, not existing S3

### Existing backups fail after update
- Check that S3 credentials are still valid
- Verify bucket/region/endpoint haven't changed
- Test connection from Backup Destinations page
- If issues persist, S3 configuration may need updating

### New destinations show "OAuth not configured"
- Set provider-specific environment variables (CLIENT_ID, CLIENT_SECRET)
- Restart Dokploy
- Verify variables are correctly set: Check logs on startup

## Upgrade Path

### From v1.x to v2.x (Multi-Provider)

1. **Backup your database**:
   ```bash
   pg_dump dokploy_db > dokploy_backup_$(date +%Y%m%d).sql
   ```

2. **Set encryption secret**:
   ```bash
   echo "DOKPLOY_ENCRYPTION_SECRET=$(openssl rand -base64 32)" >> .env
   ```

3. **Update Dokploy**:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Verify migration**:
   - Check logs for migration success
   - Test existing S3 destinations
   - Create test destination with new provider

5. **Gradual rollout**:
   - Keep using S3 for critical backups
   - Test new providers with non-critical data
   - Migrate incrementally as confidence grows

## Support

If you encounter issues during migration:

1. Check this guide's Troubleshooting section
2. Review [DEVELOPER.md](./DEVELOPER.md) for technical details
3. Check application logs for error messages
4. Search existing GitHub issues
5. Create new GitHub issue with:
   - Dokploy version
   - Migration step that failed
   - Error messages from logs
   - Database migration status

## Best Practices

- ✅ Always backup database before upgrading
- ✅ Test new providers with non-critical data first
- ✅ Keep existing S3 backups while testing new providers
- ✅ Monitor first few backups to new providers
- ✅ Document your provider configurations
- ✅ Set up alerts for backup failures
- ✅ Test restore process with new providers

## FAQ

**Q: Do I need to migrate my existing S3 destinations?**
A: No, they continue working without any changes.

**Q: Can I use both S3 and new providers?**
A: Yes! Use different providers for different services.

**Q: Will this affect my existing backups?**
A: No, existing backups in S3 are unaffected.

**Q: Do I need OAuth for all providers?**
A: No, only for Google Drive, OneDrive, and Dropbox.

**Q: Can I switch providers for an existing backup schedule?**
A: Yes, edit the backup configuration and select a different destination.

**Q: What happens to backups if I delete a destination?**
A: Files in the remote storage are NOT deleted. Only Dokploy's reference is removed.

**Q: Is there a performance impact?**
A: No, performance is the same or better due to rclone optimizations.

## Next Steps

- [Google Drive Setup](./google-drive-setup.md)
- [OneDrive Setup](./onedrive-setup.md)
- [SFTP/FTP Setup](./sftp-ftp-setup.md)
- [Developer Guide](./DEVELOPER.md)
