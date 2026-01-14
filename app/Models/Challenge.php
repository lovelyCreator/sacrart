<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasTranslations;

class Challenge extends Model
{
    use HasFactory, HasTranslations;

    protected $fillable = [
        'title',
        'description',
        'instructions',
        'image_path',
        'image_url',
        'thumbnail_path',
        'thumbnail_url',
        'display_order',
        'is_active',
        'is_featured',
        'start_date',
        'end_date',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
        'display_order' => 'integer',
    ];

    /**
     * Get translatable fields for this model
     */
    protected function getTranslatableFields(): array
    {
        return ['title', 'description', 'instructions'];
    }

    /**
     * Get all user challenges for this challenge
     */
    public function userChallenges(): HasMany
    {
        return $this->hasMany(UserChallenge::class);
    }

    /**
     * Get active challenges
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('start_date')
                  ->orWhere('start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now());
            });
    }

    /**
     * Get featured challenges
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Get image URL helper
     */
    public function getImageUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }
        
        if ($this->image_path) {
            $baseUrl = config('app.url');
            return $baseUrl . '/' . ltrim($this->image_path, '/');
        }
        
        return null;
    }

    /**
     * Get thumbnail URL helper
     */
    public function getThumbnailUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }
        
        if ($this->thumbnail_path) {
            $baseUrl = config('app.url');
            return $baseUrl . '/' . ltrim($this->thumbnail_path, '/');
        }
        
        // Fallback to main image
        return $this->image_url;
    }
}
