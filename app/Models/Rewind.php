<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Rewind extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'year',
        'slug',
        'description',
        'short_description',
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
        'visibility',
        'status',
        'is_free',
        'price',
        'published_at',
        'featured_until',
        'is_featured',
        'sort_order',
        'tags',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'featured_until' => 'datetime',
        'is_featured' => 'boolean',
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

    protected $appends = ['image_url'];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($rewind) {
            if (empty($rewind->slug)) {
                $rewind->slug = Str::slug($rewind->title);
            }
        });

        static::updating(function ($rewind) {
            if ($rewind->isDirty('title') && empty($rewind->slug)) {
                $rewind->slug = Str::slug($rewind->title);
            }
        });
    }

    /**
     * Get the instructor that owns the rewind.
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * Get the videos for this rewind.
     */
    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'rewind_videos')
                    ->withPivot('episode_number', 'sort_order')
                    ->withTimestamps()
                    ->orderByPivot('sort_order');
    }

    /**
     * Get the image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->cover_image) {
            if (str_starts_with($this->cover_image, 'http://') || str_starts_with($this->cover_image, 'https://')) {
                return $this->cover_image;
            }
            return asset('storage/' . $this->cover_image);
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
     * Scope a query to only include published rewinds.
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
     * Update statistics from videos.
     */
    public function updateStatistics()
    {
        $videos = $this->videos()->where('status', 'published')->get();
        
        $this->video_count = $videos->count();
        $this->total_duration = $videos->sum('duration');
        $this->total_views = $videos->sum('views');
        
        if ($videos->count() > 0) {
            $this->rating = $videos->avg('rating');
            $this->rating_count = $videos->sum('rating_count');
        }
        
        $this->save();
    }

    /**
     * Check if rewind is accessible to user.
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
