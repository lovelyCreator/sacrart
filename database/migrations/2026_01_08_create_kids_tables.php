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
        // Table for Kids Settings (Hero Section Featured Video, etc.)
        Schema::create('kids_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique(); // e.g., 'hero_video_id', 'about_text'
            $table->text('setting_value')->nullable();
            $table->string('setting_type')->default('text'); // text, video, image, json
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Table for Kids Videos (specific educational videos for kids)
        Schema::create('kids_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained('videos')->onDelete('cascade');
            $table->integer('display_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('display_order');
            $table->index('is_featured');
            $table->index('is_active');
        });

        // Table for Downloadable Resources (PDFs, Coloring Sheets, etc.)
        Schema::create('kids_resources', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('resource_type')->default('pdf'); // pdf, image, zip
            $table->string('file_path'); // Storage path
            $table->string('file_url')->nullable(); // Public URL
            $table->string('thumbnail_path')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->integer('file_size')->nullable(); // in bytes
            $table->integer('download_count')->default(0);
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('tags')->nullable(); // ["coloring", "saints", "christmas"]
            $table->timestamps();
            
            $table->index('resource_type');
            $table->index('is_active');
            $table->index('display_order');
        });

        // Table for Kids Products (Shop Items)
        Schema::create('kids_products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('long_description')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('original_price', 10, 2)->nullable();
            $table->string('currency')->default('EUR');
            $table->string('image_path')->nullable();
            $table->string('image_url')->nullable();
            $table->json('gallery_images')->nullable(); // Array of image URLs
            $table->string('badge_text')->nullable(); // "Kit Completo", "Principiantes"
            $table->string('badge_color')->default('bg-primary'); // Tailwind class
            $table->integer('stock_quantity')->default(0);
            $table->boolean('in_stock')->default(true);
            $table->integer('display_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('sku')->nullable()->unique();
            $table->json('tags')->nullable(); // ["painting", "clay", "beginner"]
            $table->string('external_link')->nullable(); // Link to external shop if needed
            $table->timestamps();
            
            $table->index('is_active');
            $table->index('is_featured');
            $table->index('display_order');
            $table->index('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kids_products');
        Schema::dropIfExists('kids_resources');
        Schema::dropIfExists('kids_videos');
        Schema::dropIfExists('kids_settings');
    }
};
