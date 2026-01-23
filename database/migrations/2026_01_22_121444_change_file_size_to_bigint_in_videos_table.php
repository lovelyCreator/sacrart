<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change file_size from integer to bigInteger in videos table
        // Integer max value is ~2.1GB, but videos can be larger
        if (Schema::hasColumn('videos', 'file_size')) {
            DB::statement('ALTER TABLE `videos` MODIFY `file_size` BIGINT NULL');
        }

        // Also update reels table if it exists and has the column
        if (Schema::hasTable('reels') && Schema::hasColumn('reels', 'file_size')) {
            DB::statement('ALTER TABLE `reels` MODIFY `file_size` BIGINT NULL');
        }

        // Also update kids_videos table if it exists and has the column
        if (Schema::hasTable('kids_videos') && Schema::hasColumn('kids_videos', 'file_size')) {
            DB::statement('ALTER TABLE `kids_videos` MODIFY `file_size` BIGINT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to integer (may cause data loss if values exceed integer max)
        if (Schema::hasColumn('videos', 'file_size')) {
            DB::statement('ALTER TABLE `videos` MODIFY `file_size` INT NULL');
        }

        if (Schema::hasTable('reels') && Schema::hasColumn('reels', 'file_size')) {
            DB::statement('ALTER TABLE `reels` MODIFY `file_size` INT NULL');
        }

        if (Schema::hasTable('kids_videos') && Schema::hasColumn('kids_videos', 'file_size')) {
            DB::statement('ALTER TABLE `kids_videos` MODIFY `file_size` INT NULL');
        }
    }
};
