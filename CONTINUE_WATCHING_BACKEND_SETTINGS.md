# Continue Watching - Backend Settings & Configuration

## Overview
This document explains all backend settings, configurations, and implementation details for the "Continue Watching" feature.

---

## 1. API Endpoint

### Route
```
GET /api/progress/continue-watching
```

**Location:** `routes/api.php` (line 89)

**Controller:** `App\Http\Controllers\Api\UserProgressController@continueWatching`

**Authentication:** Required (user must be logged in)

---

## 2. Controller Method

### File: `app/Http/Controllers/Api/UserProgressController.php`

**Method:** `continueWatching(Request $request)`

### Query Logic

The method fetches videos with the following criteria:

1. **User Filter:**
   - Only videos watched by the authenticated user
   - `where('user_id', $user->id)`

2. **Video Filter:**
   - Must have a valid video_id
   - `whereNotNull('video_id')`

3. **Progress Filter:**
   - Videos that are NOT completed (90%+ watched)
   - OR videos with progress < 100%
   - Progress must be > 0% (excludes unwatched videos)
   ```php
   ->where(function ($q) {
       $q->where('is_completed', false)
         ->orWhere(function ($qq) {
             $qq->where('progress_percentage', '<', 100);
         });
   })
   ->where('progress_percentage', '>', 0)
   ```

4. **Ordering:**
   - Ordered by `last_watched_at` (most recently watched first)
   - `orderBy('last_watched_at', 'desc')`

5. **Limit:**
   - Default: 10 videos
   - Can be customized via `?limit=X` query parameter
   - `limit($request->get('limit', 10))`

6. **Relationships Loaded:**
   ```php
   ->with(['video.category', 'video.instructor', 'video.series', 'category'])
   ```
   - Loads video with its category, instructor, and series
   - Loads progress category

7. **Filtering:**
   - Removes any progress records where video is null
   - `filter(function ($item) { return $item->video !== null; })`

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "video_id": 5,
      "series_id": 2,
      "progress_percentage": 45,
      "time_watched": 180,
      "last_position": 180,
      "is_completed": false,
      "video_duration": 400,
      "last_watched_at": "2024-01-15T10:30:00.000000Z",
      "video": {
        "id": 5,
        "title": "Video Title",
        "series_id": 2,
        "series": {
          "id": 2,
          "title": "Series Title"
        },
        "category": {...},
        "instructor": {...}
      }
    }
  ]
}
```

---

## 3. Database Schema

### Table: `user_progress`

**Migration:** `database/migrations/2025_10_12_040711_create_user_progress_table.php`

#### Key Fields for Continue Watching:

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | foreignId | User who watched the video |
| `video_id` | foreignId (nullable) | Video being watched |
| `series_id` | foreignId (nullable) | Series the video belongs to |
| `progress_percentage` | integer | 0-100, percentage watched |
| `time_watched` | integer | Time watched in seconds |
| `last_position` | integer | Last position in seconds |
| `is_completed` | boolean | True if 90%+ watched |
| `video_duration` | integer | Total video duration in seconds |
| `last_watched_at` | timestamp | When user last watched |
| `first_watched_at` | timestamp | When user first watched |

#### Indexes:
- `unique(['user_id', 'video_id'])` - One progress per user per video
- `index(['user_id', 'last_watched_at'])` - For sorting continue watching
- `index(['user_id', 'is_completed'])` - For filtering incomplete videos

---

## 4. Progress Update Logic

### File: `app/Models/UserProgress.php`

**Method:** `updateVideoProgress(User $user, Video $video, int $timeWatched, int $videoDuration)`

### Key Settings:

1. **Completion Threshold:**
   ```php
   $isCompleted = $progressPercentage >= 90; // Consider 90% as completed
   ```
   - Videos are marked as "completed" when 90%+ is watched
   - This means videos with 90-99% progress will NOT appear in continue watching

2. **Progress Calculation:**
   ```php
   $progressPercentage = $videoDuration > 0 
       ? min(100, round(($timeWatched / $videoDuration) * 100)) 
       : 0;
   ```
   - Calculated as: `(time_watched / video_duration) * 100`
   - Capped at 100%

3. **Auto-updates:**
   - Updates `series_id` from video
   - Updates `last_watched_at` to current timestamp
   - Increments `watch_count` and `total_watch_time`
   - Updates series progress if video belongs to a series

---

## 5. Configuration Options

### Adjustable Settings:

#### A. Completion Threshold (Line 117 in UserProgress.php)
```php
$isCompleted = $progressPercentage >= 90; // Change this value
```
- **Current:** 90% = completed
- **To show more videos:** Lower to 95% or 98%
- **To show fewer videos:** Lower to 85% or 80%

#### B. Minimum Progress (Line 281 in UserProgressController.php)
```php
->where('progress_percentage', '>', 0)
```
- **Current:** Only videos with > 0% progress
- **To include all started videos:** Keep as is
- **To exclude very short watches:** Change to `> 5` or `> 10`

#### C. Default Limit (Line 284 in UserProgressController.php)
```php
->limit($request->get('limit', 10))
```
- **Current:** 10 videos by default
- **To show more:** Change default to 15, 20, etc.
- **Can be overridden:** Frontend can pass `?limit=20`

#### D. Ordering (Line 282 in UserProgressController.php)
```php
->orderBy('last_watched_at', 'desc')
```
- **Current:** Most recently watched first
- **Alternatives:**
  - `orderBy('progress_percentage', 'desc')` - Most progress first
  - `orderBy('first_watched_at', 'desc')` - Recently started first
  - `orderBy('last_watched_at', 'asc')` - Oldest first

---

## 6. API Request Example

### Frontend Call:
```typescript
const response = await userProgressApi.continueWatching(10);
```

### Backend Request:
```
GET /api/progress/continue-watching?limit=10
Headers:
  Authorization: Bearer {token}
```

### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "video_id": 5,
      "series_id": 2,
      "progress_percentage": 45,
      "time_watched": 180,
      "last_position": 180,
      "is_completed": false,
      "video_duration": 400,
      "last_watched_at": "2024-01-15T10:30:00.000000Z",
      "video": {
        "id": 5,
        "title": "Video Title",
        "series_id": 2,
        "series": {
          "id": 2,
          "title": "Series Title"
        }
      }
    }
  ]
}
```

---

## 7. Customization Guide

### To Change What Videos Appear:

1. **Include completed videos (90-99%):**
   ```php
   // In continueWatching() method
   ->where('progress_percentage', '>', 0)
   ->where('progress_percentage', '<', 100) // Add this
   ```

2. **Exclude very short watches (< 5%):**
   ```php
   ->where('progress_percentage', '>=', 5) // Instead of > 0
   ```

3. **Show only recently watched (last 7 days):**
   ```php
   ->where('last_watched_at', '>=', now()->subDays(7))
   ```

4. **Show videos from specific series only:**
   ```php
   ->whereHas('video', function($q) {
       $q->where('series_id', $seriesId);
   })
   ```

---

## 8. Performance Considerations

### Database Indexes:
The following indexes are already in place for optimal performance:
- `unique(['user_id', 'video_id'])` - Fast lookups
- `index(['user_id', 'last_watched_at'])` - Fast sorting
- `index(['user_id', 'is_completed'])` - Fast filtering

### Query Optimization:
- Uses eager loading (`with()`) to prevent N+1 queries
- Filters null videos in PHP (after query) to avoid complex SQL
- Limits results to reduce data transfer

---

## 9. Testing

### Test the Endpoint:
```bash
# Using curl
curl -X GET "http://localhost:8000/api/progress/continue-watching?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### Expected Behavior:
- Returns only videos with 0% < progress < 90%
- Ordered by most recently watched
- Includes full video, series, category, and instructor data
- Maximum 10 videos by default (or limit specified)

---

## 10. Troubleshooting

### Videos Not Appearing:
1. **Check progress_percentage:**
   - Must be > 0 and < 90 (or < 100 if is_completed is false)
   
2. **Check last_watched_at:**
   - Must not be null
   - Should be recent for top results

3. **Check video relationship:**
   - Video must exist and not be deleted
   - Video must be accessible to user

4. **Check authentication:**
   - User must be logged in
   - Token must be valid

### Performance Issues:
- Check database indexes are created
- Monitor query execution time
- Consider caching for frequently accessed data

---

## Summary

The continue watching feature uses:
- **Database:** `user_progress` table
- **API:** `GET /api/progress/continue-watching`
- **Logic:** Shows videos with 0% < progress < 90%
- **Ordering:** Most recently watched first
- **Limit:** 10 videos by default
- **Relationships:** Loads video, series, category, instructor

All settings can be customized in `UserProgressController.php` and `UserProgress.php` model.

