<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Traits\HasTranslations;

class KidsResource extends Model
{
    use HasFactory, HasTranslations;

    protected $fillable = [
        'title',
        'description',
        'resource_type',
        'file_path',
        'file_url',
        'thumbnail_path',
        'thumbnail_url',
        'file_size',
        'download_count',
        'display_order',
        'is_active',
        'tags',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'download_count' => 'integer',
        'display_order' => 'integer',
        'is_active' => 'boolean',
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the full file URL
     */
    public function getFileUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }

        if ($this->file_path) {
            return Storage::disk('public')->url($this->file_path);
        }

        return null;
    }

    /**
     * Get the full thumbnail URL
     */
    public function getThumbnailUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }

        if ($this->thumbnail_path) {
            return Storage::disk('public')->url($this->thumbnail_path);
        }

        return null;
    }

    /**
     * Increment download count
     */
    public function incrementDownloads()
    {
        $this->increment('download_count');
    }

    /**
     * Scope to get only active resources
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('resource_type', $type);
    }

    /**
     * Get translatable fields for this model
     */
    protected function getTranslatableFields(): array
    {
        return ['title', 'description'];
    }
}
