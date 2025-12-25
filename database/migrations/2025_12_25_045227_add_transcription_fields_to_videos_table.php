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
            // Add multilingual transcription fields
            $table->text('transcription')->nullable()->after('description_pt');
            $table->text('transcription_en')->nullable()->after('transcription');
            $table->text('transcription_es')->nullable()->after('transcription_en');
            $table->text('transcription_pt')->nullable()->after('transcription_es');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn([
                'transcription',
                'transcription_en',
                'transcription_es',
                'transcription_pt',
            ]);
        });
    }
};
