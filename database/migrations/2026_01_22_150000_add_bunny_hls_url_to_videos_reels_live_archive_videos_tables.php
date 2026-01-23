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
        // Add bunny_hls_url to videos table
        if (Schema::hasTable('videos') && !Schema::hasColumn('videos', 'bunny_hls_url')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->string('bunny_hls_url', 1000)->nullable()->after('bunny_embed_url');
            });
        }

        // Add bunny_hls_url to reels table
        if (Schema::hasTable('reels') && !Schema::hasColumn('reels', 'bunny_hls_url')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->string('bunny_hls_url', 1000)->nullable()->after('bunny_embed_url');
            });
        }

        // Add bunny_hls_url to live_archive_videos table
        if (Schema::hasTable('live_archive_videos') && !Schema::hasColumn('live_archive_videos', 'bunny_hls_url')) {
            Schema::table('live_archive_videos', function (Blueprint $table) {
                $table->string('bunny_hls_url', 1000)->nullable()->after('bunny_embed_url');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove bunny_hls_url from videos table
        if (Schema::hasTable('videos') && Schema::hasColumn('videos', 'bunny_hls_url')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->dropColumn('bunny_hls_url');
            });
        }

        // Remove bunny_hls_url from reels table
        if (Schema::hasTable('reels') && Schema::hasColumn('reels', 'bunny_hls_url')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->dropColumn('bunny_hls_url');
            });
        }

        // Remove bunny_hls_url from live_archive_videos table
        if (Schema::hasTable('live_archive_videos') && Schema::hasColumn('live_archive_videos', 'bunny_hls_url')) {
            Schema::table('live_archive_videos', function (Blueprint $table) {
                $table->dropColumn('bunny_hls_url');
            });
        }
    }
};
