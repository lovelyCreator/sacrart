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
        Schema::create('rewind_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rewind_id')->constrained()->onDelete('cascade');
            $table->foreignId('video_id')->constrained()->onDelete('cascade');
            $table->integer('episode_number')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            // Ensure unique video per rewind
            $table->unique(['rewind_id', 'video_id']);
            $table->index(['rewind_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rewind_videos');
    }
};
