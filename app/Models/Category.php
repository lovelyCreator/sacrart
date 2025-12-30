<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_en',
        'name_es',
        'name_pt',
        'slug',
        'description',
        'description_en',
        'description_es',
        'description_pt',
        'color',
        'icon',
        'image',
        'is_active',
        'sort_order',
        'is_homepage_featured',
        'homepage_image',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'is_homepage_featured' => 'boolean',
    ];

    protected $appends = ['image_url'];

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    /**
     * Get the series for the category.
     */
    public function series(): HasMany
    {
        return $this->hasMany(Series::class);
    }

    /**
     * Get the published series for the category.
     */
    public function publishedSeries(): HasMany
    {
        return $this->series()->where('status', 'published');
    }

    /**
     * Get the videos for the category.
     * Videos have both category_id (direct) and series_id (through series).
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class, 'category_id');
    }

    /**
     * Get the published videos for the category.
     */
    public function publishedVideos(): HasMany
    {
        return $this->videos()->where('status', 'published');
    }

    /**
     * Scope a query to only include active categories.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to order categories by sort order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }


    /**
     * Get name in current locale
     */
    public function getNameAttribute($value): ?string
    {
        $locale = app()->getLocale();
        
        // Return the appropriate column based on locale
        switch ($locale) {
            case 'es':
                return $this->attributes['name_es'] ?? $this->attributes['name_en'] ?? $value;
            case 'pt':
                return $this->attributes['name_pt'] ?? $this->attributes['name_en'] ?? $value;
            case 'en':
            default:
                return $this->attributes['name_en'] ?? $value;
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
     * Get all translations in structured format
     */
    public function getAllTranslations(): array
    {
        return [
            'name' => [
                'en' => $this->attributes['name_en'] ?? $this->attributes['name'] ?? '',
                'es' => $this->attributes['name_es'] ?? '',
                'pt' => $this->attributes['name_pt'] ?? '',
            ],
            'description' => [
                'en' => $this->attributes['description_en'] ?? $this->attributes['description'] ?? '',
                'es' => $this->attributes['description_es'] ?? '',
                'pt' => $this->attributes['description_pt'] ?? '',
            ],
        ];
    }

    /**
     * Get the full image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->image) {
            if (str_starts_with($this->image, 'http')) {
                return $this->image;
            }
            return url('storage/' . $this->image);
        }
        return null;
    }

}