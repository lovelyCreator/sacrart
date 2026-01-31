# HLS URL Update - Scheduled Task Setup

The `update_hls_from_bunny` / `hls:update` command refreshes HLS URLs from Bunny.net to prevent token expiration. It should run **every 5 minutes** and **independently** of the Laravel web server.

## Option 1: Linux / Mac - System Cron (Recommended)

### Step 1: Make the script executable
```bash
chmod +x scripts/run_update_hls.sh
```

### Step 2: Edit crontab
```bash
crontab -e
```

### Step 3: Add this line (runs every 5 minutes)
```cron
*/5 * * * * /path/to/ana-rey-video/scripts/run_update_hls.sh
```

**Replace `/path/to/ana-rey-video`** with your actual project path, e.g.:
- `/home/user/ana-rey-video/scripts/run_update_hls.sh`
- `/var/www/ana-rey-video/scripts/run_update_hls.sh`

### Example with full path
```cron
*/5 * * * * cd /var/www/ana-rey-video && php artisan hls:update >> /var/www/ana-rey-video/storage/logs/hls-update.log 2>&1
```

---

## Option 2: Windows - Task Scheduler

### Step 1: Open Task Scheduler
- Press `Win + R`, type `taskschd.msc`, press Enter

### Step 2: Create Basic Task
1. Click **Create Basic Task**
2. Name: `Update HLS URLs`
3. Trigger: **Daily** (we'll change to 5 min)
4. Action: **Start a program**
5. Program: `php` (or full path like `C:\php\php.exe`)
6. Arguments: `artisan hls:update`
7. Start in: `D:\work\project\workana\ana-rey-video` (your project path)

### Step 3: Set to run every 5 minutes
1. After creating, right-click the task → **Properties**
2. **Triggers** tab → Edit the trigger
3. Change "Repeat task every" to **5 minutes**
4. Set duration to **Indefinitely**

### Alternative: Use the batch script
- Program: `D:\work\project\workana\ana-rey-video\scripts\run_update_hls.bat`
- Start in: `D:\work\project\workana\ana-rey-video`

---

## Option 3: Laravel Scheduler (requires one cron to trigger)

Add a single cron that runs every minute. Laravel will then run `hls:update` every 5 minutes:

```cron
* * * * * cd /path/to/ana-rey-video && php artisan schedule:run >> /dev/null 2>&1
```

**Note:** Option 1 (direct cron every 5 min) is simpler and more independent - no need for Laravel scheduler.

---

## Logs

Output is written to: `storage/logs/hls-update.log`

Check logs:
```bash
tail -f storage/logs/hls-update.log
```

---

## Manual Run

Test the command manually:
```bash
php artisan hls:update
```

Dry run (no database changes):
```bash
php artisan hls:update --dry-run
```
