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
        Schema::table('reels', function (Blueprint $table) {
            // Add multilingual fields for title (only if they don't exist)
            if (!Schema::hasColumn('reels', 'title_en')) {
                $table->string('title_en')->nullable()->after('title');
            }
            if (!Schema::hasColumn('reels', 'title_es')) {
                $table->string('title_es')->nullable()->after('title_en');
            }
            if (!Schema::hasColumn('reels', 'title_pt')) {
                $table->string('title_pt')->nullable()->after('title_es');
            }
            
            // Add multilingual fields for description
            if (!Schema::hasColumn('reels', 'description_en')) {
                $table->text('description_en')->nullable()->after('description');
            }
            if (!Schema::hasColumn('reels', 'description_es')) {
                $table->text('description_es')->nullable()->after('description_en');
            }
            if (!Schema::hasColumn('reels', 'description_pt')) {
                $table->text('description_pt')->nullable()->after('description_es');
            }
            
            // Add multilingual fields for short_description
            if (!Schema::hasColumn('reels', 'short_description_en')) {
                $table->text('short_description_en')->nullable()->after('short_description');
            }
            if (!Schema::hasColumn('reels', 'short_description_es')) {
                $table->text('short_description_es')->nullable()->after('short_description_en');
            }
            if (!Schema::hasColumn('reels', 'short_description_pt')) {
                $table->text('short_description_pt')->nullable()->after('short_description_es');
            }
            
            // Add category_id (foreign key will be added in a separate migration after reel_categories table exists)
            if (!Schema::hasColumn('reels', 'category_id')) {
                $table->unsignedBigInteger('category_id')->nullable()->after('category_tag');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reels', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn([
                'category_id',
                'title_en', 'title_es', 'title_pt',
                'description_en', 'description_es', 'description_pt',
                'short_description_en', 'short_description_es', 'short_description_pt',
            ]);
        });
    }
};
