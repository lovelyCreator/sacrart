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
        Schema::create('challenges', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // e.g., "Draw the Gran Poder"
            $table->text('description')->nullable();
            $table->text('instructions')->nullable(); // Detailed instructions for the challenge
            $table->string('image_path')->nullable(); // Challenge preview/example image
            $table->string('image_url')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->date('start_date')->nullable(); // When challenge becomes available
            $table->date('end_date')->nullable(); // When challenge expires (optional)
            $table->json('tags')->nullable(); // ["drawing", "gran-poder", "holy-week"]
            $table->timestamps();
            
            $table->index('is_active');
            $table->index('is_featured');
            $table->index('display_order');
            $table->index('start_date');
            $table->index('end_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('challenges');
    }
};
