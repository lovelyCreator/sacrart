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
        Schema::table('live_archive_videos', function (Blueprint $table) {
            // Transcription data for each language
            $table->json('transcriptions')->nullable()->after('tags');
            // Format: {
            //   "en": {
            //     "text": "Full transcription text...",
            //     "vtt": "WEBVTT\n\n00:00:00.000 --> ...",
            //     "processed_at": "2024-01-01 00:00:00",
            //     "method": "bunny_existing"
            //   },
            //   "es": { ... },
            //   "pt": { ... }
            // }
            
            // Caption URLs uploaded to Bunny.net
            $table->json('caption_urls')->nullable()->after('transcriptions');
            // Format: {
            //   "en": "https://bunny.net/captions/video-123-en.vtt",
            //   "es": "https://bunny.net/captions/video-123-es.vtt"
            // }
            
            // Audio URLs for dubbed audio
            $table->json('audio_urls')->nullable()->after('caption_urls');
            
            // Source language of the video (for transcription)
            $table->string('source_language', 10)->default('en')->after('audio_urls');
            
            // Processing status
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
        Schema::table('live_archive_videos', function (Blueprint $table) {
            $table->dropColumn([
                'transcriptions',
                'caption_urls',
                'audio_urls',
                'source_language',
                'transcription_status',
                'transcription_error',
                'transcription_processed_at',
            ]);
        });
    }
};
