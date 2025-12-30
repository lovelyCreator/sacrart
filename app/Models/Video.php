<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

use App\Models\VideoComment;
use Illuminate\Support\Str;

class Video extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'title_en',
        'title_es',
        'title_pt',
        'slug',
        'description',
        'description_en',
        'description_es',
        'description_pt',
        'short_description',
        'short_description_en',
        'short_description_es',
        'short_description_pt',
        'category_id', // Videos belong to Category (for direct access)
        'series_id', // Videos belong to Series (Series belong to Category)
        'instructor_id',
        'video_url',
        'video_file_path',
        'bunny_video_id',
        'bunny_video_url',
        'bunny_embed_url',
        'bunny_thumbnail_url',
        'bunny_player_url',
        'thumbnail',
        'intro_image',
        'intro_description',
        'intro_description_en',
        'intro_description_es',
        'intro_description_pt',
        'transcription',
        'transcription_en',
        'transcription_es',
        'transcription_pt',
        'duration',
        'file_size',
        'video_format',
        'video_quality',
        'streaming_urls',
        'hls_url',
        'dash_url',
        'visibility',
        'status',
        'is_free',
        'price',
        'episode_number',
        'sort_order',
        'tags',
        'views',
        'unique_views',
        'daily_views',
        'rating',
        'rating_count',
        'completion_rate',
        'published_at',
        'scheduled_at',
        'downloadable_resources',
        'allow_download',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'processing_status',
        'processing_error',
        'processed_at',
        'is_featured_process',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'processed_at' => 'datetime',
        'streaming_urls' => 'array',
        'tags' => 'array',
        'downloadable_resources' => 'array',
        'is_free' => 'boolean',
        'allow_download' => 'boolean',
        'duration' => 'integer',
        'file_size' => 'integer',
        'views' => 'integer',
        'unique_views' => 'integer',
        'daily_views' => 'array',
        'rating' => 'decimal:2',
        'rating_count' => 'integer',
        'completion_rate' => 'integer',
        'episode_number' => 'integer',
        'sort_order' => 'integer',
        'price' => 'decimal:2',
        'is_featured_process' => 'boolean',
    ];

    protected $appends = ['video_url_full', 'intro_image_url', 'thumbnail_url', 'bunny_player_url', 'likes_count', 'dislikes_count'];

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($video) {
            if (empty($video->slug)) {
                $video->slug = Str::slug($video->title);
            }
        });

        static::updating(function ($video) {
            if ($video->isDirty('title') && empty($video->slug)) {
                $video->slug = Str::slug($video->title);
            }
        });

        static::saved(function ($video) {
            // Update series statistics when video is saved
            if ($video->series) {
                $video->series->updateStatistics();
            }
        });

        static::deleted(function ($video) {
            // Update series statistics when video is deleted
            if ($video->series) {
                $video->series->updateStatistics();
            }
        });
    }

    /**
     * Get the category that owns the video.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the series that owns the video.
     */
    public function series(): BelongsTo
    {
        return $this->belongsTo(Series::class);
    }

    /**
     * Get the instructor that owns the video.
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * Get user progress for this video.
     */
    public function userProgress(): HasMany
    {
        return $this->hasMany(UserProgress::class);
    }

    /**
     * Get comments for this video.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(VideoComment::class);
    }

    /**
     * Get the full video URL.
     * Priority: Bunny.net embed URL > Bunny.net video URL > video_url > local file path
     */
    public function getVideoUrlFullAttribute(): ?string
    {
        // Priority 1: Bunny.net embed URL (for player)
        if ($this->bunny_embed_url) {
            return $this->bunny_embed_url;
        }
        
        // Priority 2: Bunny.net video URL
        if ($this->bunny_video_url) {
            return $this->bunny_video_url;
        }
        
        // Priority 3: Direct video URL
        if ($this->video_url) {
            return $this->video_url;
        }
        
        // Priority 4: Legacy local file path (for backward compatibility)
        if ($this->video_file_path) {
            // If it starts with http, it's already a full URL
            if (str_starts_with($this->video_file_path, 'http')) {
                return $this->video_file_path;
            }
            // Use streaming endpoint - it properly handles Range requests which are required for video playback
            return url("api/videos/{$this->id}/stream");
        }
        
        return null;
    }

    /**
     * Get Bunny.net player URL for embedding
     */
    public function getBunnyPlayerUrlAttribute(): ?string
    {
        return $this->bunny_embed_url;
    }

    /**
     * Get the full intro image URL.
     */
    public function getIntroImageUrlAttribute(): ?string
    {
        if ($this->intro_image) {
            if (str_starts_with($this->intro_image, 'http')) {
                return $this->intro_image;
            }
            return url('storage/' . $this->intro_image);
        }
        return null;
    }

    /**
     * Get the full thumbnail URL.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if ($this->thumbnail) {
            if (str_starts_with($this->thumbnail, 'http')) {
                return $this->thumbnail;
            }
            return url('storage/' . $this->thumbnail);
        }
        return null;
    }


    /**
     * Scope a query to only include published videos.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->where('published_at', '<=', now());
    }

    /**
     * Scope a query to filter by visibility.
     */
    public function scopeVisibleTo($query, ?string $subscriptionType)
    {
        // Default to freemium if subscription_type is null/empty
        $subscriptionType = $subscriptionType ?: 'freemium';
        
        // Admin can see all content
        if ($subscriptionType === 'admin') {
            return $query;
        }
        
        return $query->where(function ($q) use ($subscriptionType) {
            $q->where('visibility', 'freemium')
              ->orWhere('visibility', 'basic')
              ->when($subscriptionType === 'premium', function ($qq) {
                  $qq->orWhere('visibility', 'premium');
              });
        });
    }

    /**
     * Scope a query to only include videos in a series.
     */
    public function scopeInSeries($query, int $seriesId)
    {
        return $query->where('series_id', $seriesId);
    }

    /**
     * Get formatted duration.
     */
    public function getFormattedDurationAttribute()
    {
        $hours = floor($this->duration / 3600);
        $minutes = floor(($this->duration % 3600) / 60);
        $seconds = $this->duration % 60;

        if ($hours > 0) {
            return sprintf('%d:%02d:%02d', $hours, $minutes, $seconds);
        }

        return sprintf('%d:%02d', $minutes, $seconds);
    }

    /**
     * Get formatted file size.
     */
    public function getFormattedFileSizeAttribute()
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get the average rating.
     */
    public function getAverageRatingAttribute()
    {
        return $this->rating_count > 0 ? round($this->rating / $this->rating_count, 1) : 0;
    }

    /**
     * Get the total number of likes for this video.
     */
    public function getLikesCountAttribute(): int
    {
        return $this->userProgress()->where('is_liked', true)->count();
    }

    /**
     * Get the total number of dislikes for this video.
     */
    public function getDislikesCountAttribute(): int
    {
        return $this->userProgress()->where('is_disliked', true)->count();
    }

    /**
     * Check if video is accessible to user.
     */
    public function isAccessibleTo(?User $user = null): bool
    {
        // Admin can access everything
        if ($user && $user->role === 'admin') {
            return true;
        }

        // Check visibility
        switch ($this->visibility) {
            case 'freemium':
                return true;
            case 'basic':
                return $user && in_array($user->subscription_type, ['basic', 'premium', 'admin']);
            case 'premium':
                return $user && in_array($user->subscription_type, ['premium', 'admin']);
            default:
                return false;
        }
    }

    /**
     * Increment view count and update daily views tracking.
     */
    public function incrementViews()
    {
        $this->increment('views');
        
        // Update daily views tracking
        $today = now()->format('Y-m-d');
        $dailyViews = $this->daily_views ?? [];
        
        // Increment today's view count
        if (!isset($dailyViews[$today])) {
            $dailyViews[$today] = 0;
        }
        $dailyViews[$today] = ($dailyViews[$today] ?? 0) + 1;
        
        // Keep only last 30 days of data to prevent JSON from growing too large
        $cutoffDate = now()->subDays(30)->format('Y-m-d');
        $dailyViews = array_filter($dailyViews, function($date) use ($cutoffDate) {
            return $date >= $cutoffDate;
        }, ARRAY_FILTER_USE_KEY);
        
        // Sort by date descending
        krsort($dailyViews);
        
        $this->daily_views = $dailyViews;
        $this->save();
        
        // Also increment series views
        if ($this->series) {
            $this->series->increment('total_views');
        }
    }
    
    /**
     * Get views count for the last 7 days.
     */
    public function getViewsLast7Days(): int
    {
        if (!$this->daily_views || !is_array($this->daily_views)) {
            return 0;
        }
        
        $sevenDaysAgo = now()->subDays(7)->format('Y-m-d');
        $total = 0;
        
        foreach ($this->daily_views as $date => $count) {
            if ($date >= $sevenDaysAgo) {
                $total += (int)$count;
            }
        }
        
        return $total;
    }

    /**
     * Get next video in series.
     */
    public function getNextVideo()
    {
        return $this->series->videos()
            ->where('status', 'published')
            ->where('sort_order', '>', $this->sort_order)
            ->orderBy('sort_order')
            ->first();
    }

    /**
     * Get previous video in series.
     */
    public function getPreviousVideo()
    {
        return $this->series->videos()
            ->where('status', 'published')
            ->where('sort_order', '<', $this->sort_order)
            ->orderBy('sort_order', 'desc')
            ->first();
    }

    /**
     * Get title in current locale
     */
    public function getTitleAttribute($value): ?string
    {
        $locale = app()->getLocale();
        
        // Return the appropriate column based on locale
        switch ($locale) {
            case 'es':
                return $this->attributes['title_es'] ?? $this->attributes['title_en'] ?? $value;
            case 'pt':
                return $this->attributes['title_pt'] ?? $this->attributes['title_en'] ?? $value;
            case 'en':
            default:
                return $this->attributes['title_en'] ?? $value;
        }
    }

    /**
     * Get description in current locale
     */
    public function getDescriptionAttribute($value): ?string
    {
        $locale = app()->getLocale();
        
        // Return the appropriate column based on locale
        switch ($locale) {
            case 'es':
                return $this->attributes['description_es'] ?? $this->attributes['description_en'] ?? $value;
            case 'pt':
                return $this->attributes['description_pt'] ?? $this->attributes['description_en'] ?? $value;
            case 'en':
            default:
                return $this->attributes['description_en'] ?? $value;
        }
    }

    /**
     * Get short_description in current locale
     */
    public function getShortDescriptionAttribute($value): ?string
    {
        $locale = app()->getLocale();
        
        // Return the appropriate column based on locale
        switch ($locale) {
            case 'es':
                return $this->attributes['short_description_es'] ?? $this->attributes['short_description_en'] ?? $value;
            case 'pt':
                return $this->attributes['short_description_pt'] ?? $this->attributes['short_description_en'] ?? $value;
            case 'en':
            default:
                return $this->attributes['short_description_en'] ?? $value;
        }
    }

    /**
     * Get intro_description in current locale
     */
    public function getIntroDescriptionAttribute($value): ?string
    {
        $locale = app()->getLocale();
        
        // Return the appropriate column based on locale
        switch ($locale) {
            case 'es':
                return $this->attributes['intro_description_es'] ?? $this->attributes['intro_description_en'] ?? $value;
            case 'pt':
                return $this->attributes['intro_description_pt'] ?? $this->attributes['intro_description_en'] ?? $value;
            case 'en':
            default:
                return $this->attributes['intro_description_en'] ?? $value;
        }
    }

    /**
     * Get all translations in structured format
     */
    public function getAllTranslations(): array
    {
        return [
            'title' => [
                'en' => $this->attributes['title_en'] ?? $this->attributes['title'] ?? '',
                'es' => $this->attributes['title_es'] ?? '',
                'pt' => $this->attributes['title_pt'] ?? '',
            ],
            'description' => [
                'en' => $this->attributes['description_en'] ?? $this->attributes['description'] ?? '',
                'es' => $this->attributes['description_es'] ?? '',
                'pt' => $this->attributes['description_pt'] ?? '',
            ],
            'short_description' => [
                'en' => $this->attributes['short_description_en'] ?? $this->attributes['short_description'] ?? '',
                'es' => $this->attributes['short_description_es'] ?? '',
                'pt' => $this->attributes['short_description_pt'] ?? '',
            ],
            'intro_description' => [
                'en' => $this->attributes['intro_description_en'] ?? $this->attributes['intro_description'] ?? '',
                'es' => $this->attributes['intro_description_es'] ?? '',
                'pt' => $this->attributes['intro_description_pt'] ?? '',
            ],
        ];
    }

    /**
     * Get meta_title in current locale
     * Note: meta_title doesn't have multilingual columns, so return the value as-is
     */
    public function getMetaTitleAttribute($value): ?string
    {
        // meta_title doesn't have multilingual columns, return as-is
        return $value;
    }

    /**
     * Get meta_description in current locale
     * Note: meta_description doesn't have multilingual columns, so return the value as-is
     */
    public function getMetaDescriptionAttribute($value): ?string
    {
        // meta_description doesn't have multilingual columns, return as-is
        return $value;
    }
}