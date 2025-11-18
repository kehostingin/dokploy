# Google Drive Backup Destination Setup Guide

This guide will walk you through setting up Google Drive as a backup destination in Dokploy using OAuth authentication.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Admin access to your Dokploy instance
- `DOKPLOY_ENCRYPTION_SECRET` environment variable configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "Dokploy Backups")
5. Click **"Create"**

## Step 2: Enable Google Drive API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for **"Google Drive API"**
3. Click on **Google Drive API**
4. Click **"Enable"**

## Step 3: Create OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **"External"** user type (or Internal if using Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: Dokploy Backups
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On the **Scopes** page, click **"Add or Remove Scopes"**
7. Add these scopes:
   - `.../auth/drive.file` - Access to files created by the app
   - `.../auth/userinfo.email` - User email
   - `.../auth/userinfo.profile` - User profile
8. Click **"Update"** then **"Save and Continue"**
9. On **Test users** page (if External), add your email address
10. Click **"Save and Continue"**
11. Review and click **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"** as application type
4. Enter a name (e.g., "Dokploy")
5. Under **Authorized redirect URIs**, click **"Add URI"**
6. Add your Dokploy callback URL:
   ```
   https://your-dokploy-domain.com/oauth/callback
   ```
   **Important**: Replace `your-dokploy-domain.com` with your actual domain
7. Click **"Create"**
8. You'll see a dialog with your **Client ID** and **Client Secret**
9. **Copy both values** - you'll need them in the next step

## Step 5: Configure Dokploy Environment Variables

Add the following environment variables to your Dokploy instance:

```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
```

### How to add environment variables:

**Option 1: Using `.env` file**
```bash
echo "GOOGLE_DRIVE_CLIENT_ID=your-client-id" >> .env
echo "GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret" >> .env
```

**Option 2: Using docker-compose.yml**
```yaml
services:
  dokploy:
    environment:
      - GOOGLE_DRIVE_CLIENT_ID=your-client-id
      - GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
```

**Option 3: Using Docker CLI**
```bash
docker run -e GOOGLE_DRIVE_CLIENT_ID=your-client-id \
           -e GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret \
           ...
```

## Step 6: Restart Dokploy

After adding the environment variables, restart your Dokploy instance:

```bash
docker-compose restart
# or
docker restart dokploy
```

## Step 7: Create Google Drive Destination in Dokploy

1. Log in to your Dokploy dashboard
2. Navigate to **Settings** → **Backup Destinations**
3. Click **"Add Destination"**
4. Select **"Google Drive"** as the provider type
5. Enter a name for your destination (e.g., "My Google Drive")
6. Click **"Authorize with Google"**
7. A popup window will open with Google's authorization page
8. Sign in with your Google account (if not already signed in)
9. Review the permissions requested
10. Click **"Allow"** to grant access
11. The popup will close automatically
12. You'll see a success message with your account info
13. (Optional) Configure advanced settings:
    - **Root Folder ID**: Limit backups to a specific folder
    - **Team Drive ID**: Use a Google Workspace shared drive
14. Click **"Create Destination"**

## Step 8: Test the Connection

1. In the Backup Destinations list, find your Google Drive destination
2. Click the **"Test Connection"** button
3. You should see a success message if everything is configured correctly

## Step 9: Use in Backups

1. Go to any database or application in Dokploy
2. Navigate to the **Backups** tab
3. Create a new backup schedule
4. Select your Google Drive destination from the dropdown
5. Configure your backup frequency
6. Save the backup configuration

Your backups will now be automatically uploaded to Google Drive!

## Advanced Configuration

### Root Folder ID

To limit backups to a specific folder in Google Drive:

1. Open Google Drive in your browser
2. Navigate to the folder you want to use
3. The folder ID is in the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Copy the folder ID
5. When creating/editing the destination, paste it in the **Root Folder ID** field

### Team Drive (Google Workspace)

If you're using Google Workspace and want to use a shared drive:

1. Open Google Drive and navigate to **Shared drives**
2. Open the shared drive you want to use
3. The drive ID is in the URL: `https://drive.google.com/drive/folders/DRIVE_ID_HERE`
4. Copy the drive ID
5. When creating/editing the destination, paste it in the **Team Drive ID** field

## Troubleshooting

### "OAuth credentials not configured" error
- Make sure `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET` are set
- Restart Dokploy after adding environment variables
- Check for typos in the environment variable names

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console matches exactly: `https://your-domain.com/oauth/callback`
- Make sure you're using HTTPS (required for OAuth)
- Check that your domain is correct (no trailing slashes)

### "Access denied" error
- Make sure you clicked "Allow" during authorization
- Check that the required scopes are added in the OAuth consent screen
- If using "External" user type, make sure your email is added as a test user

### "Failed to complete OAuth authorization" error
- Check browser console for detailed error messages
- Verify your Google Cloud project has the Drive API enabled
- Make sure the OAuth consent screen is properly configured

### Connection test fails
- Verify you completed the OAuth authorization
- Check that the Google Drive API is enabled in your project
- Try re-authorizing by creating a new destination

## Security Best Practices

1. **Keep credentials secret**: Never commit your Client ID/Secret to version control
2. **Use HTTPS**: OAuth requires HTTPS in production
3. **Limit scope**: Only request the minimum permissions needed (`drive.file` scope)
4. **Monitor access**: Regularly review authorized applications in your Google Account settings
5. **Rotate credentials**: If credentials are compromised, revoke and create new ones immediately

## Permissions

Dokploy requests these Google Drive permissions:

- **`drive.file`**: Access to files created by Dokploy only (not all your Drive files)
- **`userinfo.email`**: Your email address for display purposes
- **`userinfo.profile`**: Your name and profile photo for display purposes

Dokploy will **ONLY** be able to:
- Create backup files
- Read/update/delete files it created
- List files it created

Dokploy will **NOT** be able to:
- Access files created by other applications
- Access your personal documents
- Share or modify permissions on files

## Revoking Access

To revoke Dokploy's access to your Google Drive:

1. Go to [Google Account → Security → Third-party apps](https://myaccount.google.com/permissions)
2. Find "Dokploy Backups" (or your app name)
3. Click **"Remove Access"**
4. In Dokploy, delete the Google Drive destination or re-authorize it

## File Organization

Backups are stored in Google Drive with this structure:

```
/dokploy-backups/
  └── database-name/
      ├── backup-2024-01-15-120000.sql.gz
      ├── backup-2024-01-16-120000.sql.gz
      └── backup-2024-01-17-120000.sql.gz
```

You can customize the path structure in your backup configuration.

## Limitations

- **File size**: Maximum 5TB per file (Google Drive limit)
- **Storage quota**: Backups count against your Google Drive storage quota
- **API quotas**: Google Drive API has usage quotas (10,000 queries per 100 seconds per user)
- **Token expiry**: Access tokens expire after 1 hour (automatically refreshed by Dokploy)

## Next Steps

- [Configure backup schedules](./backup-schedules.md)
- [Set up encryption with crypt](./crypt-encryption.md)
- [Monitor backup status](./backup-monitoring.md)
- [Restore from backups](./backup-restore.md)

## Support

For issues specific to Google Drive integration:
- Check the [Troubleshooting](#troubleshooting) section above
- Review [Google Drive API documentation](https://developers.google.com/drive/api/guides/about-sdk)
- Open an issue on GitHub with detailed error messages
