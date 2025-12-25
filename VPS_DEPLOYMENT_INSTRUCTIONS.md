# VPS Database Update Instructions

## Overview
This document outlines the steps to update the database structure on your VPS to support the correct hierarchy:
**Category → Series → Episodes/Videos**

## Prerequisites
- SSH access to your VPS
- Database backup (IMPORTANT: Always backup before migrations)
- Access to Laravel application directory

## Steps to Deploy

### 1. Backup Database
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your Laravel project directory
cd /path/to/your/laravel/project

# Create database backup
php artisan backup:run
# OR manually:
mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Pull Latest Code
```bash
# Navigate to project directory
cd /path/to/your/laravel/project

# Pull latest changes from repository
git pull origin main
# OR if using a different branch:
git pull origin your-branch-name
```

### 3. Install/Update Dependencies
```bash
# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# If you have frontend changes:
cd frontend
npm install
npm run build
cd ..
```

### 4. Run Database Migrations
```bash
# Check migration status
php artisan migrate:status

# Run the new migration to restore series table
php artisan migrate

# Verify migration ran successfully
php artisan migrate:status
```

### 5. Clear Caches
```bash
# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:clear

# Clear route cache
php artisan route:clear

# Clear view cache
php artisan view:clear

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. Update File Permissions (if needed)
```bash
# Ensure storage and cache directories are writable
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 7. Restart Services (if using process manager)
```bash
# If using Supervisor for queues
sudo supervisorctl restart all

# If using systemd for services
sudo systemctl restart your-app-service
```

## Migration Details

The migration `2025_12_24_163147_restore_series_table_and_fix_video_relationships.php` will:

1. **Recreate the `series` table** if it doesn't exist
2. **Update `videos` table**:
   - Rename `category_id` column to `series_id` (if exists)
   - Add `series_id` foreign key to `series` table
   - Update indexes
3. **Update `user_progress` table**:
   - Rename `category_id` column to `series_id` (if exists)
   - Add `series_id` foreign key to `series` table

## Verification Steps

After migration, verify the structure:

```bash
# Check if series table exists
php artisan tinker
>>> Schema::hasTable('series')
# Should return: true

# Check videos table structure
>>> Schema::hasColumn('videos', 'series_id')
# Should return: true

# Check foreign key constraints
>>> DB::select("SHOW CREATE TABLE videos");
# Should show foreign key to series table
```

## Rollback (if needed)

If something goes wrong, you can rollback:

```bash
# Rollback last migration
php artisan migrate:rollback

# Or rollback specific number of migrations
php artisan migrate:rollback --step=1

# Restore from backup if needed
mysql -u username -p database_name < backup_file.sql
```

## Post-Migration Tasks

1. **Update existing data** (if you have videos that need to be assigned to series):
   ```sql
   -- You may need to create series for existing categories
   -- and assign videos to those series
   ```

2. **Test the admin panel**:
   - Create a Category
   - Create a Series in that Category
   - Create Episodes/Videos in that Series
   - Verify the hierarchy works correctly

## Troubleshooting

### Issue: Migration fails with "Table already exists"
- The series table might already exist. Check: `php artisan tinker` → `Schema::hasTable('series')`
- If it exists, the migration will skip creating it

### Issue: Foreign key constraint fails
- Ensure all existing videos have valid series_id values
- You may need to create series first and assign videos to them

### Issue: Column rename fails
- Some databases don't support column rename in all contexts
- You may need to manually alter the table structure

## Support

If you encounter issues:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check database error logs
3. Verify database user has ALTER TABLE permissions
4. Ensure all migrations are in the correct order

