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
        Schema::table('rewinds', function (Blueprint $table) {
            // Note: Rewinds don't have video directly, but their videos (through rewind_videos) will have transcriptions
            // This is kept for consistency if needed in future
            $table->json('transcriptions')->nullable()->after('is_featured');
            $table->json('caption_urls')->nullable()->after('transcriptions');
            $table->string('source_language', 10)->default('en')->after('caption_urls');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rewinds', function (Blueprint $table) {
            $table->dropColumn([
                'transcriptions',
                'caption_urls',
                'source_language',
            ]);
        });
    }
};
