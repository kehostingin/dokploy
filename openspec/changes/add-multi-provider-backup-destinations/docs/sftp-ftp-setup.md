# SFTP and FTP Backup Destinations

Configure SFTP or FTP servers as backup destinations for secure file transfer.

## SFTP Setup (SSH File Transfer Protocol)

### Prerequisites
- SFTP server with SSH access
- Username and password OR SSH private key
- Server hostname/IP and port (default: 22)

### Configuration

1. Go to **Settings** → **Backup Destinations**
2. Click **"Add Destination"** → Select **"SFTP"**
3. Enter configuration:
   - **Name**: My SFTP Server
   - **Host**: sftp.example.com (or IP address)
   - **Port**: 22 (default SSH port)
   - **Username**: your-username
   - **Authentication**: Choose one:
     - **Password**: Enter password
     - **SSH Private Key**: Paste your private key

4. Click **"Create Destination"**
5. Test connection

### Using SSH Key Authentication (Recommended)

**Generate SSH key pair:**
```bash
ssh-keygen -t rsa -b 4096 -C "dokploy-backup"
```

**Add public key to server:**
```bash
# On your SFTP server
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Use private key in Dokploy:**
- Copy entire private key including headers:
  ```
  -----BEGIN RSA PRIVATE KEY-----
  ...
  -----END RSA PRIVATE KEY-----
  ```
- Paste in **SSH Private Key** field

### Security Best Practices

- ✅ Use SSH key authentication over passwords
- ✅ Use non-standard SSH port (e.g., 2222) to reduce automated attacks
- ✅ Enable SSH key-only authentication on server
- ✅ Use firewall rules to limit access
- ✅ Regularly rotate SSH keys

## FTP Setup (File Transfer Protocol)

### Prerequisites
- FTP server
- Username and password
- Server hostname/IP and port (default: 21)
- FTPS support recommended for encryption

### Configuration

1. Go to **Settings** → **Backup Destinations**
2. Click **"Add Destination"** → Select **"FTP"**
3. Enter configuration:
   - **Name**: My FTP Server
   - **Host**: ftp.example.com
   - **Port**: 21 (FTP) or 990 (FTPS implicit)
   - **Username**: your-username
   - **Password**: your-password
   - **Use TLS/SSL**: Enable for FTPS

4. Click **"Create Destination"**
5. Test connection

### FTP vs FTPS

| Feature | FTP | FTPS |
|---------|-----|------|
| Encryption | ❌ None | ✅ TLS/SSL |
| Port | 21 | 990 (implicit) or 21 (explicit) |
| Security | Low | High |
| Recommendation | Development only | Production |

**Always use FTPS in production** to encrypt credentials and data in transit.

## Common Configuration Examples

### Hetzner Storage Box (SFTP)
```
Host: your-username.your-host.de
Port: 23
Username: your-username
Password: your-password
```

### DigitalOcean Droplet (SFTP)
```
Host: your-droplet-ip
Port: 22
Username: root (or custom user)
Auth: SSH Private Key
```

### Local NAS (FTP/SFTP)
```
Host: 192.168.1.100
Port: 21 (FTP) or 22 (SFTP)
Username: backup-user
Password: your-password
```

## Troubleshooting

### SFTP Connection Issues

**"Connection refused"**
- Check if SSH service is running: `systemctl status sshd`
- Verify port is open: `netstat -tuln | grep 22`
- Check firewall rules

**"Permission denied (publickey)"**
- Verify SSH key is correctly formatted
- Check `authorized_keys` permissions (must be 600)
- Ensure user's home directory permissions are correct

**"Host key verification failed"**
- Remove old host key: `ssh-keygen -R hostname`
- Accept new host key when connecting

### FTP Connection Issues

**"Connection timed out"**
- Check if FTP service is running
- Verify port 21 (or custom port) is open
- Check firewall rules for FTP

**"TLS/SSL handshake failed"**
- Verify server supports FTPS
- Check certificate validity
- Try disabling TLS temporarily to test

### Permission Issues

**"Permission denied" when uploading**
- Verify user has write permissions: `chmod 755 /backup/path`
- Check disk space: `df -h`
- Ensure user owns the directory: `chown user:group /backup/path`

## Testing Connection

After creating a destination:

1. Click **"Test Connection"** button
2. Check for success message
3. If failed, review error message:
   - Connection errors → Network/firewall issue
   - Authentication errors → Username/password/key issue
   - Permission errors → File system permissions

## File Organization

Backups are stored with this structure:

```
/backups/
  └── database-name/
      ├── backup-2024-01-15-120000.sql.gz
      ├── backup-2024-01-16-120000.sql.gz
      └── backup-2024-01-17-120000.sql.gz
```

## Performance Optimization

### SFTP Performance
- Use compression for large files: `--sftp-disable-concurrent-reads`
- Increase buffer size for faster transfers
- Use local network for best performance

### FTP Performance
- Enable binary mode (automatic in rclone)
- Use passive mode if behind NAT/firewall
- Consider FTPS explicit mode for better firewall traversal

## Security Checklist

- [ ] Using SFTP or FTPS (not plain FTP)
- [ ] Strong passwords (20+ characters) or SSH keys
- [ ] Firewall configured to limit access
- [ ] Non-standard ports when possible
- [ ] Regular security updates on server
- [ ] Monitoring enabled for suspicious activity
- [ ] Backup rotation configured to manage disk space

## Backup Retention

Configure automatic cleanup to prevent disk space issues:

1. Set retention period in backup configuration
2. Old backups are automatically deleted
3. Monitor disk space on your server

## Next Steps

- [Encrypt backups with crypt](./crypt-encryption.md)
- [Set up backup schedules](./backup-schedules.md)
- [Monitor backup status](./backup-monitoring.md)
