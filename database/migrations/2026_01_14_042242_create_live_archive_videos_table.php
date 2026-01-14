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
        Schema::create('live_archive_videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            
            // Bunny.net video fields
            $table->string('bunny_video_id')->nullable();
            $table->string('bunny_video_url')->nullable();
            $table->string('bunny_embed_url');
            $table->string('bunny_thumbnail_url')->nullable();
            
            // Video metadata
            $table->integer('duration')->default(0); // Duration in seconds
            $table->string('thumbnail_url')->nullable();
            
            // Status and visibility
            $table->enum('status', ['draft', 'published', 'archived'])->default('published');
            $table->enum('visibility', ['freemium', 'premium', 'exclusive'])->default('freemium');
            $table->boolean('is_free')->default(true);
            
            // Tags for categorization
            $table->json('tags')->nullable();
            
            // Statistics
            $table->integer('views')->default(0);
            $table->integer('unique_views')->default(0);
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('meta_keywords')->nullable();
            
            // Publishing
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable(); // When it was moved to archive
            
            $table->timestamps();
            
            // Indexes
            $table->index(['status', 'published_at']);
            $table->index(['visibility', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('live_archive_videos');
    }
};
