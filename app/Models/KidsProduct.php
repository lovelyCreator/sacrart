<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Traits\HasTranslations;

class KidsProduct extends Model
{
    use HasFactory, HasTranslations;

    protected $fillable = [
        'title',
        'description',
        'long_description',
        'price',
        'original_price',
        'currency',
        'image_path',
        'image_url',
        'gallery_images',
        'badge_text',
        'badge_color',
        'stock_quantity',
        'in_stock',
        'display_order',
        'is_featured',
        'is_active',
        'sku',
        'tags',
        'external_link',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'gallery_images' => 'array',
        'stock_quantity' => 'integer',
        'in_stock' => 'boolean',
        'display_order' => 'integer',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the full image URL
     */
    public function getImageUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }

        if ($this->image_path) {
            return Storage::disk('public')->url($this->image_path);
        }

        return null;
    }

    /**
     * Check if product has discount
     */
    public function getHasDiscountAttribute()
    {
        return $this->original_price && $this->original_price > $this->price;
    }

    /**
     * Calculate discount percentage
     */
    public function getDiscountPercentageAttribute()
    {
        if (!$this->has_discount) {
            return 0;
        }

        return round((($this->original_price - $this->price) / $this->original_price) * 100);
    }

    /**
     * Scope to get only active products
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get featured products
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to get in-stock products
     */
    public function scopeInStock($query)
    {
        return $query->where('in_stock', true);
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    /**
     * Get translatable fields for this model
     */
    protected function getTranslatableFields(): array
    {
        return ['title', 'description', 'long_description', 'badge_text'];
    }
}
