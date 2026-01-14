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
        Schema::create('live_archive_video_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('live_archive_video_id')->constrained('live_archive_videos')->onDelete('cascade');
            
            // Progress tracking
            $table->integer('progress_percentage')->default(0); // 0-100
            $table->integer('time_watched')->default(0); // Time watched in seconds
            $table->integer('last_position')->default(0); // Last position in seconds
            $table->boolean('is_completed')->default(false);
            $table->integer('video_duration')->nullable(); // Total video duration
            
            // Timestamps
            $table->timestamp('last_watched_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->unique(['user_id', 'live_archive_video_id']); // One progress record per user per video
            $table->index(['user_id', 'last_watched_at']);
            $table->index(['user_id', 'is_completed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('live_archive_video_progress');
    }
};
