# OneDrive Backup Destination Setup Guide

This guide covers setting up Microsoft OneDrive as a backup destination using OAuth authentication.

## Prerequisites

- Microsoft account (personal or work/school)
- Access to [Azure Portal](https://portal.azure.com/)
- Admin access to Dokploy
- `DOKPLOY_ENCRYPTION_SECRET` configured

## Quick Setup

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Configure:
   - **Name**: Dokploy Backups
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: Web → `https://your-dokploy-domain.com/oauth/callback`
5. Click **"Register"**

### 2. Configure API Permissions

1. In your app, go to **API permissions**
2. Click **"Add a permission"** → **Microsoft Graph**
3. Select **Delegated permissions**
4. Add these permissions:
   - `Files.ReadWrite.All` - Read and write files
   - `User.Read` - Sign in and read user profile
   - `offline_access` - Maintain access to data
5. Click **"Add permissions"**
6. Click **"Grant admin consent"** (if you have admin rights)

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **"New client secret"**
3. Enter description: "Dokploy"
4. Select expiration (recommend: 24 months)
5. Click **"Add"**
6. **Copy the secret value immediately** (you won't see it again!)

### 4. Get Application ID

1. Go to **Overview** page of your app
2. Copy the **Application (client) ID**

### 5. Configure Dokploy

Add environment variables:

```bash
ONEDRIVE_CLIENT_ID=your-application-id
ONEDRIVE_CLIENT_SECRET=your-client-secret
```

Restart Dokploy:
```bash
docker-compose restart
```

### 6. Authorize in Dokploy

1. Go to **Settings** → **Backup Destinations**
2. Click **"Add Destination"** → Select **"OneDrive"**
3. Enter destination name
4. Click **"Authorize with Microsoft"**
5. Sign in with your Microsoft account
6. Accept permissions
7. (Optional) Configure:
   - **Drive ID**: Use specific drive
   - **Drive Type**: Personal/Business/Document Library
8. Click **"Create Destination"**

## Advanced Configuration

### Using Specific Drive

For OneDrive for Business with multiple drives:

1. Get Drive ID from Microsoft Graph Explorer:
   ```
   https://developer.microsoft.com/en-us/graph/graph-explorer
   ```
2. Query: `GET /me/drives`
3. Copy the `id` of the drive you want to use
4. Enter in **Drive ID** field

### Drive Types

- **Personal**: Personal OneDrive account
- **Business**: OneDrive for Business
- **Document Library**: SharePoint document library

## Troubleshooting

### "OAuth not configured"
- Verify environment variables are set
- Restart Dokploy

### "Redirect URI mismatch"
- Check Azure redirect URI matches: `https://your-domain.com/oauth/callback`
- Must use HTTPS in production

### "Admin consent required"
- Contact your IT administrator
- Or use "Accounts in any organizational directory" if available

### "Invalid client secret"
- Secrets expire - create a new one in Azure
- Update `ONEDRIVE_CLIENT_SECRET` and restart

## Permissions

Dokploy requests:
- **Files.ReadWrite.All**: Create, read, update, delete backup files
- **User.Read**: Display your name/email
- **offline_access**: Refresh tokens for continuous access

## Limitations

- **File size**: 250GB per file (OneDrive limit)
- **Storage quota**: Backups count against your OneDrive quota
- **Personal**: 5GB free, up to 1TB with Microsoft 365
- **Business**: Typically 1TB per user

## Revoking Access

1. Go to [Microsoft Account → Privacy → Apps and services](https://account.microsoft.com/privacy/app-permissions)
2. Find "Dokploy Backups"
3. Click **"Remove"**

## Next Steps

- [Google Drive Setup](./google-drive-setup.md)
- [SFTP/FTP Setup](./sftp-ftp-setup.md)
- [Encryption Guide](./crypt-encryption.md)
