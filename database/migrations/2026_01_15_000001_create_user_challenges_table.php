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
        Schema::create('user_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('challenge_id')->constrained('challenges')->onDelete('cascade');
            $table->enum('status', ['pending', 'completed'])->default('pending');
            $table->unsignedBigInteger('image_id')->nullable(); // Reference to generated image (video ID)
            $table->foreign('image_id')->references('id')->on('videos')->onDelete('set null');
            $table->string('generated_image_url')->nullable(); // Direct URL to generated image
            $table->text('generated_image_path')->nullable(); // Path to generated image
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            // Ensure one entry per user per challenge
            $table->unique(['user_id', 'challenge_id']);
            $table->index('status');
            $table->index('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_challenges');
    }
};
