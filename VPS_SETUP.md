# VPS Setup Guide

This guide explains how to configure your frontend to connect to a Laravel backend running on a VPS.

## Prerequisites

- Laravel backend running on VPS (accessible via IP or domain)
- Frontend running locally or on a different server
- VPS IP address or domain name
- Port number where Laravel is running (default: 8000)

## Step 1: Configure Frontend Environment

Create or update `frontend/.env` file with your VPS URL:

```env
# Replace YOUR_VPS_IP_OR_DOMAIN with your actual VPS IP or domain
# Examples:
# VITE_API_BASE_URL=http://135.181.66.232:8000/api
# VITE_API_BASE_URL=http://yourdomain.com:8000/api
# VITE_API_BASE_URL=https://api.yourdomain.com/api

VITE_API_BASE_URL=http://YOUR_VPS_IP_OR_DOMAIN:8000/api
```

**Important:** 
- If using HTTPS, use `https://` instead of `http://`
- If using a standard port (80 for HTTP, 443 for HTTPS), you can omit the port
- Restart the frontend dev server after changing `.env`

## Step 2: Update Laravel CORS Configuration

Update `config/cors.php` to include your frontend URL in the allowed origins:

```php
'allowed_origins' => [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    // Add your frontend URL here
    'http://YOUR_FRONTEND_URL:3000',  // If frontend is on a different server
    'http://YOUR_FRONTEND_DOMAIN',     // If using a domain
],
```

**If your frontend is running locally:**
- You don't need to add anything if it's already in the list
- The CORS config already includes `localhost:3000`

**If your frontend is also on the VPS or a different server:**
- Add the frontend URL to the `allowed_origins` array

## Step 3: Configure Laravel .env on VPS

On your VPS, ensure your Laravel `.env` file has:

```env
APP_URL=http://YOUR_VPS_IP_OR_DOMAIN:8000
# or
APP_URL=https://YOUR_VPS_DOMAIN

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
# or if frontend is on a different server:
FRONTEND_URL=http://YOUR_FRONTEND_URL
```

## Step 4: Start Laravel Server on VPS

Make sure Laravel is accessible from outside the VPS:

```bash
# Allow external connections (important!)
php artisan serve --host=0.0.0.0 --port=8000
```

**Or use a process manager like PM2 or Supervisor:**

```bash
# Using PM2
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name laravel-api

# Or configure as a systemd service
```

## Step 5: Firewall Configuration

Ensure your VPS firewall allows connections on port 8000:

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8000/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Or check your cloud provider's security group/firewall rules
```

## Step 6: Test the Connection

1. **Test from browser:**
   Visit `http://YOUR_VPS_IP:8000/api` in your browser. You should see a response.

2. **Test from frontend:**
   Start your frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```
   
   Check the browser console for any CORS errors.

## Common Issues

### CORS Errors

**Error:** `Access to fetch at 'http://VPS_IP:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:**
1. Add `http://localhost:3000` to `config/cors.php` `allowed_origins` (if not already there)
2. Clear Laravel config cache: `php artisan config:clear`
3. Restart Laravel server

### Connection Refused

**Error:** `Failed to fetch` or `Connection refused`

**Solution:**
1. Verify Laravel is running: `php artisan serve --host=0.0.0.0 --port=8000`
2. Check firewall rules allow port 8000
3. Verify VPS IP/domain is correct in frontend `.env`
4. Test with curl: `curl http://YOUR_VPS_IP:8000/api`

### SSL/HTTPS Issues

If using HTTPS:
1. Update frontend `.env`: `VITE_API_BASE_URL=https://yourdomain.com/api`
2. Update CORS: `'https://yourdomain.com'` in `allowed_origins`
3. Ensure SSL certificate is properly configured

## Production Setup

For production, consider:

1. **Use a reverse proxy (Nginx/Apache):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Use HTTPS with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Use a process manager:**
   - PM2: `pm2 start "php artisan serve --host=0.0.0.0 --port=8000"`
   - Supervisor: Configure a systemd service

4. **Update frontend `.env`:**
   ```env
   VITE_API_BASE_URL=https://yourdomain.com/api
   ```

## Quick Reference

**Frontend `.env` (frontend/.env):**
```env
VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api
```

**Laravel CORS (config/cors.php):**
```php
'allowed_origins' => [
    'http://localhost:3000',  // Your frontend URL
    // Add other origins as needed
],
```

**Start Laravel on VPS:**
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

**Test connection:**
```bash
curl http://YOUR_VPS_IP:8000/api
```
