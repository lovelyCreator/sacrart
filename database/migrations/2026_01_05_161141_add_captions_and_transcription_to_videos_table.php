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
        Schema::table('videos', function (Blueprint $table) {
            // Transcription data for each language
            $table->json('transcriptions')->nullable()->after('processing_error');
            // Format: {
            //   "en": {
            //     "text": "Full transcription text",
            //     "vtt": "WebVTT caption file content",
            //     "bunny_caption_url": "https://...",
            //     "processed_at": "2026-01-05 10:00:00"
            //   },
            //   "es": {...},
            //   "pt": {...}
            // }
            
            // Caption URLs uploaded to Bunny.net
            $table->json('caption_urls')->nullable()->after('transcriptions');
            // Format: {
            //   "en": "https://bunny.net/captions/video-123-en.vtt",
            //   "es": "https://bunny.net/captions/video-123-es.vtt",
            //   "pt": "https://bunny.net/captions/video-123-pt.vtt"
            // }
            
            // Source language of the video (for transcription)
            $table->string('source_language', 10)->default('en')->after('caption_urls');
            
            // Deepgram processing status
            $table->enum('transcription_status', ['pending', 'processing', 'completed', 'failed'])->default('pending')->after('source_language');
            $table->text('transcription_error')->nullable()->after('transcription_status');
            $table->timestamp('transcription_processed_at')->nullable()->after('transcription_error');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn([
                'transcriptions',
                'caption_urls',
                'source_language',
                'transcription_status',
                'transcription_error',
                'transcription_processed_at',
            ]);
        });
    }
};
