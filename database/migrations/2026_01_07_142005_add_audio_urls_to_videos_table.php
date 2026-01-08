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
        // Add audio_urls to videos table
        Schema::table('videos', function (Blueprint $table) {
            $table->json('audio_urls')->nullable()->after('caption_urls');
            // Format: {
            //   "en": "https://example.com/audio/video-123-en.mp3",
            //   "es": "https://example.com/audio/video-123-es.mp3",
            //   "pt": "https://example.com/audio/video-123-pt.mp3"
            // }
        });

        // Add audio_urls to reels table
        Schema::table('reels', function (Blueprint $table) {
            $table->json('audio_urls')->nullable()->after('caption_urls');
        });

        // Rewinds don't have audio_urls (they're collections of videos)
        // So we skip rewinds table
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn('audio_urls');
        });

        Schema::table('reels', function (Blueprint $table) {
            $table->dropColumn('audio_urls');
        });
    }
};
