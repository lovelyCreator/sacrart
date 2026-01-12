<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserChallenge extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'challenge_id',
        'status',
        'image_id',
        'generated_image_url',
        'generated_image_path',
        'completed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    /**
     * Get the user that owns this challenge entry
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the challenge
     */
    public function challenge(): BelongsTo
    {
        return $this->belongsTo(Challenge::class);
    }

    /**
     * Get the generated image (video model)
     */
    public function generatedImage(): BelongsTo
    {
        return $this->belongsTo(Video::class, 'image_id');
    }

    /**
     * Mark challenge as completed
     */
    public function markAsCompleted($imageId = null, $imageUrl = null, $imagePath = null)
    {
        $this->status = 'completed';
        $this->completed_at = now();
        
        if ($imageId) {
            $this->image_id = $imageId;
        }
        
        if ($imageUrl) {
            $this->generated_image_url = $imageUrl;
        }
        
        if ($imagePath) {
            $this->generated_image_path = $imagePath;
        }
        
        $this->save();
    }

    /**
     * Check if challenge is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Get the generated image URL
     */
    public function getGeneratedImageUrl()
    {
        if ($this->generated_image_url) {
            return $this->generated_image_url;
        }
        
        if ($this->generated_image_path) {
            $baseUrl = config('app.url');
            return $baseUrl . '/' . ltrim($this->generated_image_path, '/');
        }
        
        if ($this->image_id && $this->generatedImage) {
            return $this->generatedImage->thumbnail_url ?? $this->generatedImage->poster_url;
        }
        
        return null;
    }
}
