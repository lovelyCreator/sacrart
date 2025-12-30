<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

class Series extends Model
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
        'visibility',
        'status',
        'category_id',
        'instructor_id',
        'thumbnail',
        'cover_image',
        'trailer_url',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'video_count',
        'total_duration',
        'total_views',
        'rating',
        'rating_count',
        'price',
        'is_free',
        'published_at',
        'featured_until',
        'is_featured',
        'is_homepage_featured',
        'sort_order',
        'tags',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'featured_until' => 'datetime',
        'is_featured' => 'boolean',
        'is_homepage_featured' => 'boolean',
        'is_free' => 'boolean',
        'rating' => 'decimal:2',
        'price' => 'decimal:2',
        'tags' => 'array',
        'video_count' => 'integer',
        'total_duration' => 'integer',
        'total_views' => 'integer',
        'rating_count' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($series) {
            if (empty($series->slug)) {
                $series->slug = Str::slug($series->title);
            }
        });

        static::updating(function ($series) {
            if ($series->isDirty('title') && empty($series->slug)) {
                $series->slug = Str::slug($series->title);
            }
        });
    }

    /**
     * Get the category that owns the series.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the instructor that owns the series.
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * Get the videos for the series.
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    /**
     * Get the published videos for the series.
     */
    public function publishedVideos(): HasMany
    {
        return $this->videos()->where('status', 'published');
    }

    /**
     * Get user progress for this series.
     */
    public function userProgress(): HasMany
    {
        return $this->hasMany(UserProgress::class);
    }

    /**
     * Scope a query to only include published series.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
                    ->whereNotNull('published_at');
    }

    /**
     * Scope a query to only include featured series.
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true)
                    ->where(function ($q) {
                        $q->whereNull('featured_until')
                          ->orWhere('featured_until', '>', now());
                    });
    }

    /**
     * Scope a query to filter by visibility.
     */
    public function scopeVisibleTo($query, string $subscriptionType)
    {
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
     * Get the route key for the model.
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    /**
     * Get formatted duration.
     */
    public function getFormattedDurationAttribute()
    {
        $hours = floor($this->total_duration / 3600);
        $minutes = floor(($this->total_duration % 3600) / 60);

        if ($hours > 0) {
            return $hours . 'h ' . $minutes . 'm';
        }

        return $minutes . 'm';
    }

    /**
     * Get the average rating.
     */
    public function getAverageRatingAttribute()
    {
        return $this->rating_count > 0 ? round($this->rating / $this->rating_count, 1) : 0;
    }

    /**
     * Update series statistics.
     */
    public function updateStatistics()
    {
        $videos = $this->publishedVideos;
        
        $this->update([
            'video_count' => $videos->count(),
            'total_duration' => $videos->sum('duration'),
            'total_views' => $videos->sum('views'),
        ]);
    }

    /**
     * Check if series is accessible to user.
     */
    public function isAccessibleTo(?User $user = null): bool
    {
        // Admin can access everything
        if ($user && $user->isAdmin()) {
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
        ];
    }
}