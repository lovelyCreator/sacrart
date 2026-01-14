<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasTranslations;

class LiveArchiveVideo extends Model
{
    use HasFactory, HasTranslations;

    protected $fillable = [
        'title',
        'description',
        'bunny_video_id',
        'bunny_video_url',
        'bunny_embed_url',
        'bunny_thumbnail_url',
        'duration',
        'thumbnail_url',
        'status',
        'visibility',
        'is_free',
        'tags',
        'views',
        'unique_views',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'published_at',
        'archived_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_free' => 'boolean',
        'duration' => 'integer',
        'views' => 'integer',
        'unique_views' => 'integer',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    /**
     * Get translatable fields for this model
     */
    protected function getTranslatableFields(): array
    {
        return ['title', 'description'];
    }

    /**
     * Scope to get published videos
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope to get active videos (published and not archived)
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'published')
            ->whereNull('archived_at');
    }
}
