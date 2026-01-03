<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\App;

class Reel extends Model
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
        'instructor_id',
        'category_id',
        'bunny_video_id',
        'bunny_video_url',
        'bunny_embed_url',
        'bunny_thumbnail_url',
        'bunny_player_url',
        'video_url',
        'video_file_path',
        'duration',
        'file_size',
        'video_format',
        'video_quality',
        'thumbnail',
        'thumbnail_url',
        'intro_image',
        'intro_image_url',
        'visibility',
        'status',
        'is_free',
        'price',
        'category_tag',
        'tags',
        'sort_order',
        'views',
        'unique_views',
        'rating',
        'rating_count',
        'published_at',
        'scheduled_at',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'processing_status',
        'processing_error',
        'processed_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'processed_at' => 'datetime',
        'is_free' => 'boolean',
        'duration' => 'integer',
        'file_size' => 'integer',
        'views' => 'integer',
        'unique_views' => 'integer',
        'rating' => 'decimal:2',
        'rating_count' => 'integer',
        'price' => 'decimal:2',
        'sort_order' => 'integer',
        'tags' => 'array',
    ];

    protected $appends = ['video_url_full', 'intro_image_url', 'thumbnail_url', 'bunny_player_url'];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($reel) {
            if (empty($reel->slug)) {
                $reel->slug = Str::slug($reel->title);
            }
        });

        static::updating(function ($reel) {
            if ($reel->isDirty('title') && empty($reel->slug)) {
                $reel->slug = Str::slug($reel->title);
            }
        });
    }

    /**
     * Get the instructor that owns the reel.
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * Get the category that owns the reel.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ReelCategory::class, 'category_id');
    }

    /**
     * Get localized title based on current locale.
     */
    public function getTitleAttribute($value)
    {
        $locale = App::getLocale();
        switch ($locale) {
            case 'es':
                return $this->attributes['title_es'] ?? $this->attributes['title_en'] ?? $value;
            case 'pt':
                return $this->attributes['title_pt'] ?? $this->attributes['title_en'] ?? $value;
            default:
                return $this->attributes['title_en'] ?? $value;
        }
    }

    /**
     * Get localized description based on current locale.
     */
    public function getDescriptionAttribute($value)
    {
        $locale = App::getLocale();
        switch ($locale) {
            case 'es':
                return $this->attributes['description_es'] ?? $this->attributes['description_en'] ?? $value;
            case 'pt':
                return $this->attributes['description_pt'] ?? $this->attributes['description_en'] ?? $value;
            default:
                return $this->attributes['description_en'] ?? $value;
        }
    }

    /**
     * Get localized short_description based on current locale.
     */
    public function getShortDescriptionAttribute($value)
    {
        $locale = App::getLocale();
        switch ($locale) {
            case 'es':
                return $this->attributes['short_description_es'] ?? $this->attributes['short_description_en'] ?? $value;
            case 'pt':
                return $this->attributes['short_description_pt'] ?? $this->attributes['short_description_en'] ?? $value;
            default:
                return $this->attributes['short_description_en'] ?? $value;
        }
    }

    /**
     * Get all translations for admin editing.
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

    /**
     * Get the full video URL.
     * Priority: Bunny.net embed URL > Bunny.net video URL > video_url > local file path
     */
    public function getVideoUrlFullAttribute(): ?string
    {
        if ($this->bunny_embed_url) {
            return $this->bunny_embed_url;
        }
        if ($this->bunny_video_url) {
            return $this->bunny_video_url;
        }
        if ($this->video_url) {
            return $this->video_url;
        }
        if ($this->video_file_path) {
            return asset('storage/' . $this->video_file_path);
        }
        return null;
    }

    /**
     * Get the full thumbnail URL.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if ($this->bunny_thumbnail_url) {
            return $this->bunny_thumbnail_url;
        }
        if ($this->thumbnail) {
            if (str_starts_with($this->thumbnail, 'http://') || str_starts_with($this->thumbnail, 'https://')) {
                return $this->thumbnail;
            }
            return asset('storage/' . $this->thumbnail);
        }
        return null;
    }

    /**
     * Get the full intro image URL.
     */
    public function getIntroImageUrlAttribute(): ?string
    {
        if ($this->intro_image) {
            if (str_starts_with($this->intro_image, 'http://') || str_starts_with($this->intro_image, 'https://')) {
                return $this->intro_image;
            }
            return asset('storage/' . $this->intro_image);
        }
        return $this->thumbnail_url;
    }

    /**
     * Get the Bunny.net player URL.
     */
    public function getBunnyPlayerUrlAttribute(): ?string
    {
        if ($this->bunny_video_id) {
            return "https://iframe.mediadelivery.net/embed/{$this->bunny_video_id}";
        }
        return null;
    }

    /**
     * Scope a query to only include published reels.
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
        $subscriptionType = $subscriptionType ?: 'freemium';
        
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
     * Increment views count.
     */
    public function incrementViews()
    {
        $this->increment('views');
    }

    /**
     * Check if reel is accessible to user.
     */
    public function isAccessibleTo($user): bool
    {
        if ($this->status !== 'published') {
            return false;
        }

        if (!$user) {
            return $this->visibility === 'freemium';
        }

        $subscriptionType = $user->subscription_type ?: 'freemium';
        
        if ($subscriptionType === 'admin') {
            return true;
        }

        if ($this->visibility === 'freemium') {
            return true;
        }

        if ($this->visibility === 'basic' && in_array($subscriptionType, ['basic', 'premium'])) {
            return true;
        }

        if ($this->visibility === 'premium' && $subscriptionType === 'premium') {
            return true;
        }

        return false;
    }
}
