<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KidsVideo extends Model
{
    use HasFactory;

    protected $fillable = [
        'video_id',
        'display_order',
        'is_featured',
        'is_active',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the video associated with this kids video
     */
    public function video()
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Scope to get only active videos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get featured videos
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }
}
