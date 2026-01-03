<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reels', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('short_description')->nullable();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Video content - Bunny.net integration
            $table->string('bunny_video_id')->nullable();
            $table->string('bunny_video_url')->nullable();
            $table->string('bunny_embed_url')->nullable();
            $table->string('bunny_thumbnail_url')->nullable();
            $table->string('bunny_player_url')->nullable();
            $table->string('video_url')->nullable(); // Fallback video URL
            $table->string('video_file_path')->nullable(); // Local file path
            $table->integer('duration')->default(0); // Duration in seconds
            $table->integer('file_size')->nullable(); // File size in bytes
            $table->string('video_format')->nullable(); // mp4, webm, etc.
            $table->string('video_quality')->nullable(); // 720p, 1080p, etc.
            
            // Thumbnail/Image
            $table->string('thumbnail')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->string('intro_image')->nullable();
            $table->string('intro_image_url')->nullable();
            
            // Access control
            $table->enum('visibility', ['freemium', 'basic', 'premium'])->default('freemium');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->boolean('is_free')->default(true);
            $table->decimal('price', 8, 2)->nullable();
            
            // Reel organization
            $table->string('category_tag')->nullable(); // tips, curiosidades, procesos, preguntas, bendiciones
            $table->json('tags')->nullable(); // Array of tags
            $table->integer('sort_order')->default(0);
            
            // Statistics
            $table->integer('views')->default(0);
            $table->integer('unique_views')->default(0);
            $table->decimal('rating', 3, 2)->default(0.00);
            $table->integer('rating_count')->default(0);
            
            // Publishing
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('meta_keywords')->nullable();
            
            // Video processing status
            $table->enum('processing_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->text('processing_error')->nullable();
            $table->timestamp('processed_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['status', 'visibility']);
            $table->index(['category_tag', 'status']);
            $table->index(['published_at']);
            $table->index(['sort_order']);
            $table->index(['processing_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reels');
    }
};
