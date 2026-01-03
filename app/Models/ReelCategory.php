<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\App;

class ReelCategory extends Model
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
        'icon',
        'color',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        static::updating(function ($category) {
            if ($category->isDirty('name') && empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    /**
     * Get the reels for this category.
     */
    public function reels(): HasMany
    {
        return $this->hasMany(Reel::class, 'category_id');
    }

    /**
     * Get localized name based on current locale.
     */
    public function getNameAttribute($value)
    {
        $locale = App::getLocale();
        switch ($locale) {
            case 'es':
                return $this->attributes['name_es'] ?? $this->attributes['name_en'] ?? $value;
            case 'pt':
                return $this->attributes['name_pt'] ?? $this->attributes['name_en'] ?? $value;
            default:
                return $this->attributes['name_en'] ?? $value;
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
     * Get all translations for admin editing.
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
}
