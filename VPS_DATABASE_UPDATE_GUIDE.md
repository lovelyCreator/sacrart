# VPS Database Update Guide

## Overview
This guide will help you update your VPS database to support:
1. **Settings**: Multilingual support (code changes, no migration needed)
2. **Videos**: Category → Series → Episodes structure (requires migration)

## ⚠️ IMPORTANT: Backup First!

**ALWAYS backup your database before running migrations!**

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your project
cd /path/to/your/laravel/project

# Create database backup
mysqldump -u your_db_user -p your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Enter your database password when prompted
```

## Step-by-Step Update Process

### Step 1: Connect to VPS and Navigate to Project

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to Laravel project directory
cd /var/www/your-project-name
# OR wherever your project is located
```

### Step 2: Pull Latest Code

```bash
# Pull latest changes from repository
git pull origin main
# OR your branch name
git pull origin your-branch-name

# Verify you have the new migration file
ls -la database/migrations/ | grep "2025_12_24"
# Should show: 2025_12_24_163147_restore_series_table_and_fix_video_relationships.php
```

### Step 3: Install/Update Dependencies

```bash
# Update PHP dependencies
composer install --no-dev --optimize-autoloader

# If frontend changes were made
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Check Current Migration Status

```bash
# Check which migrations are pending
php artisan migrate:status

# You should see these pending migrations:
# - 2025_01_15_000000_add_bunny_fields_to_videos_table (may already be applied)
# - 2025_12_11_174825_change_payment_transactions_currency_default_to_eur
# - 2025_12_24_163147_restore_series_table_and_fix_video_relationships
```

### Step 5: Check Current Database Structure

Before running migrations, check your current database structure:

```bash
# Enter Laravel Tinker
php artisan tinker

# Check if series table exists
>>> Schema::hasTable('series')
# If returns: false - table doesn't exist, migration will create it
# If returns: true - table exists, migration will skip creation

# Check videos table structure
>>> Schema::hasColumn('videos', 'category_id')
# If returns: true - migration will rename it to series_id
>>> Schema::hasColumn('videos', 'series_id')
# If returns: true - videos already use series_id

# Exit tinker
>>> exit
```

### Step 6: Handle Existing Data (IMPORTANT!)

**If you have existing videos in your database**, you need to handle them:

#### Option A: If videos table has `category_id` but no `series_id`

You need to create series for existing categories and assign videos to them:

```bash
php artisan tinker
```

```php
// Get all categories
$categories = \App\Models\Category::all();

foreach ($categories as $category) {
    // Check if series already exists for this category
    $series = \App\Models\Series::where('category_id', $category->id)->first();
    
    if (!$series) {
        // Create a default series for this category
        $series = \App\Models\Series::create([
            'title' => $category->name . ' - Default Series',
            'slug' => \Illuminate\Support\Str::slug($category->name . '-default-series'),
            'description' => 'Default series for ' . $category->name,
            'category_id' => $category->id,
            'status' => 'published',
            'visibility' => 'freemium',
        ]);
    }
    
    // Update videos in this category to use the series
    \App\Models\Video::where('category_id', $category->id)
        ->update(['series_id' => $series->id]);
}

exit
```

#### Option B: If videos already have `series_id`

The migration will handle everything automatically. Just proceed to Step 7.

### Step 7: Run Migrations

```bash
# Run all pending migrations
php artisan migrate

# OR run specific migration only
php artisan migrate --path=database/migrations/2025_12_24_163147_restore_series_table_and_fix_video_relationships.php
```

**Expected Output:**
```
Migrating: 2025_12_24_163147_restore_series_table_and_fix_video_relationships
Migrated:  2025_12_24_163147_restore_series_table_and_fix_video_relationships (XX.XXms)
```

### Step 8: Verify Migration Success

```bash
php artisan tinker
```

```php
// Verify series table exists
>>> Schema::hasTable('series')
// Should return: true

// Verify videos table has series_id
>>> Schema::hasColumn('videos', 'series_id')
// Should return: true

// Verify videos table doesn't have category_id (or it was renamed)
>>> Schema::hasColumn('videos', 'category_id')
// Should return: false (if migration renamed it)

// Check foreign key constraints
>>> DB::select("SHOW CREATE TABLE videos");
// Should show foreign key to series table

exit
```

### Step 9: Clear All Caches

```bash
# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:clear

# Clear route cache
php artisan route:clear

# Clear view cache
php artisan view:clear

# Clear compiled files
php artisan clear-compiled

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### Step 10: Restart Services (if applicable)

```bash
# If using Supervisor for queues
sudo supervisorctl restart all

# If using systemd
sudo systemctl restart php8.1-fpm  # Adjust PHP version
sudo systemctl restart nginx       # or apache2

# If using Laravel Horizon
php artisan horizon:terminate
```

## Settings Update (No Migration Needed)

The settings changes we made are **code-level only**:
- Extended translatable keys in `SiteSetting` model
- Updated `SettingsController` to handle multilingual translations

**No database migration is needed** for settings. The existing `site_settings` and `content_translations` tables already support this.

## Testing After Update

### 1. Test Admin Panel

1. Login to admin panel
2. Go to Content Management
3. **Create Category** → Should work
4. **Create Series** in that Category → Should work
5. **Create Episode/Video** in that Series → Should work
6. Verify the hierarchy: Category → Series → Episode

### 2. Test Settings

1. Go to Settings page
2. Test saving settings in different tabs:
   - Hero settings (with multilingual)
   - About settings (with multilingual)
   - Testimonials
   - General settings
   - Contact settings
3. Switch languages and verify translations save correctly

### 3. Test Frontend

1. Visit homepage
2. Check if videos display correctly
3. Navigate to video pages
4. Verify series/category relationships work

## Troubleshooting

### Issue: Migration fails with "Table 'series' already exists"

**Solution:** The migration checks for table existence, so this shouldn't happen. But if it does:
```bash
# Check if series table exists
php artisan tinker
>>> Schema::hasTable('series')
>>> exit

# If it exists, the migration will skip creating it
# Just continue with the migration
```

### Issue: Foreign key constraint fails

**Solution:** Ensure all videos have valid series_id values:
```bash
php artisan tinker
```

```php
// Check for videos without series_id
>>> \App\Models\Video::whereNull('series_id')->count()

// If count > 0, assign them to series (see Step 6)
```

### Issue: Column rename fails

**Solution:** Some databases require different syntax. You may need to:
```sql
-- Manually check current structure
SHOW COLUMNS FROM videos;

-- If category_id exists, the migration will rename it
-- If it fails, you may need to manually alter:
ALTER TABLE videos CHANGE category_id series_id BIGINT UNSIGNED;
```

### Issue: "Class 'Series' not found"

**Solution:** Clear caches and regenerate autoload:
```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

## Rollback (If Needed)

If something goes wrong:

```bash
# Rollback last migration
php artisan migrate:rollback --step=1

# Or restore from backup
mysql -u your_db_user -p your_database_name < backup_file.sql
```

## Summary

**Database Changes:**
- ✅ Settings: No migration needed (code changes only)
- ✅ Videos: Migration restores series table and updates relationships

**Key Migration:**
- `2025_12_24_163147_restore_series_table_and_fix_video_relationships.php`

**What It Does:**
1. Creates `series` table (if doesn't exist)
2. Renames `videos.category_id` → `videos.series_id`
3. Updates `user_progress` table similarly
4. Sets up proper foreign key relationships

**After Migration:**
- Category → Series → Episodes structure is restored
- All settings support multilingual translations
- Admin panel works with correct hierarchy

## Need Help?

If you encounter issues:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check database error logs
3. Verify database user has ALTER TABLE permissions
4. Ensure all migrations are in correct order

