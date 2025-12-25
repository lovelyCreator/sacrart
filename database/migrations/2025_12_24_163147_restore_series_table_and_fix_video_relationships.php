<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration restores the series table and fixes the video relationships
     * to support: Category → Series → Episodes/Videos hierarchy
     */
    public function up(): void
    {
        // Step 1: Recreate series table if it doesn't exist
        if (!Schema::hasTable('series')) {
            Schema::create('series', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('slug')->unique();
                $table->text('description');
                $table->text('short_description')->nullable();
                $table->enum('visibility', ['freemium', 'basic', 'premium'])->default('freemium');
                $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
                $table->foreignId('category_id')->constrained()->onDelete('cascade');
                $table->foreignId('instructor_id')->nullable()->constrained('users')->onDelete('set null');
                
                // Media fields
                $table->string('thumbnail')->nullable();
                $table->string('cover_image')->nullable();
                $table->string('trailer_url')->nullable();
                
                // SEO fields
                $table->string('meta_title')->nullable();
                $table->text('meta_description')->nullable();
                $table->string('meta_keywords')->nullable();
                
                // Statistics
                $table->integer('video_count')->default(0);
                $table->integer('total_duration')->default(0); // in seconds
                $table->integer('total_views')->default(0);
                $table->decimal('rating', 3, 2)->default(0.00); // 0.00 to 5.00
                $table->integer('rating_count')->default(0);
                
                // Pricing (for premium content)
                $table->decimal('price', 8, 2)->nullable();
                $table->boolean('is_free')->default(true);
                
                // Publishing
                $table->timestamp('published_at')->nullable();
                $table->timestamp('featured_until')->nullable();
                $table->boolean('is_featured')->default(false);
                
                // Sorting and organization
                $table->integer('sort_order')->default(0);
                $table->json('tags')->nullable(); // Array of tags
                
                $table->timestamps();
                
                // Indexes
                $table->index(['status', 'visibility']);
                $table->index(['category_id', 'status']);
                $table->index(['is_featured', 'published_at']);
                $table->index('published_at');
            });
        }

        // Step 2: Update videos table to have both series_id and category_id
        // First check if videos table has category_id column
        if (Schema::hasColumn('videos', 'category_id')) {
            // Keep category_id, just update foreign key if needed
            // Check if foreign key exists and points to categories
            try {
                Schema::table('videos', function (Blueprint $table) {
                    // Try to drop existing foreign key if it exists
                    $table->dropForeign(['category_id']);
                });
            } catch (\Exception $e) {
                // Foreign key might not exist or already dropped, continue
            }
            
            // Update foreign key to categories table
            Schema::table('videos', function (Blueprint $table) {
                $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
            });
        } else {
            // Add category_id if it doesn't exist
            Schema::table('videos', function (Blueprint $table) {
                $table->foreignId('category_id')->after('short_description')->constrained()->onDelete('cascade');
            });
        }

        // Now handle series_id
        if (!Schema::hasColumn('videos', 'series_id')) {
            // Add series_id column
            Schema::table('videos', function (Blueprint $table) {
                $table->foreignId('series_id')->after('category_id')->constrained()->onDelete('cascade');
            });
        } else {
            // Ensure foreign key exists for series_id
            try {
                Schema::table('videos', function (Blueprint $table) {
                    $table->dropForeign(['series_id']);
                });
            } catch (\Exception $e) {
                // Foreign key might not exist, continue
            }
            Schema::table('videos', function (Blueprint $table) {
                $table->foreign('series_id')->references('id')->on('series')->onDelete('cascade');
            });
        }

        // Add/update indexes
        Schema::table('videos', function (Blueprint $table) {
            // Drop old indexes if they exist
            try {
                $table->dropIndex('videos_category_id_status_index');
            } catch (\Exception $e) {}
            try {
                $table->dropIndex('videos_episode_category_index');
            } catch (\Exception $e) {}
            try {
                $table->dropIndex('videos_series_id_status_index');
            } catch (\Exception $e) {}
            try {
                $table->dropIndex('videos_episode_series_index');
            } catch (\Exception $e) {}
        });

        // Add new indexes
        Schema::table('videos', function (Blueprint $table) {
            $table->index(['category_id', 'status'], 'videos_category_id_status_index');
            $table->index(['series_id', 'status'], 'videos_series_id_status_index');
            $table->index(['episode_number', 'series_id'], 'videos_episode_series_index');
        });

        // Step 2.5: Populate category_id for existing videos based on their series_id
        // This ensures all videos have both category_id and series_id
        if (Schema::hasTable('series') && Schema::hasColumn('videos', 'series_id') && Schema::hasColumn('videos', 'category_id')) {
            \DB::statement('
                UPDATE videos 
                INNER JOIN series ON videos.series_id = series.id 
                SET videos.category_id = series.category_id 
                WHERE videos.category_id IS NULL OR videos.category_id = 0
            ');
        }

        // Step 3: Update user_progress table to use series_id instead of category_id
        if (Schema::hasColumn('user_progress', 'category_id')) {
            Schema::table('user_progress', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
            
            Schema::table('user_progress', function (Blueprint $table) {
                $table->renameColumn('category_id', 'series_id');
            });
            
            Schema::table('user_progress', function (Blueprint $table) {
                $table->foreign('series_id')->references('id')->on('series')->onDelete('cascade');
            });
        } elseif (!Schema::hasColumn('user_progress', 'series_id')) {
            Schema::table('user_progress', function (Blueprint $table) {
                $table->foreignId('series_id')->constrained()->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert videos table - remove series_id, keep category_id
        if (Schema::hasColumn('videos', 'series_id')) {
            Schema::table('videos', function (Blueprint $table) {
                $table->dropForeign(['series_id']);
                $table->dropIndex('videos_series_id_status_index');
                $table->dropIndex('videos_episode_series_index');
                $table->dropColumn('series_id');
            });
        }

        // Revert user_progress table
        if (Schema::hasColumn('user_progress', 'series_id')) {
            Schema::table('user_progress', function (Blueprint $table) {
                $table->dropForeign(['series_id']);
                $table->renameColumn('series_id', 'category_id');
                $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
            });
        }

        // Drop series table
        Schema::dropIfExists('series');
    }
};
