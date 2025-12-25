<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add multilingual columns to categories table
        Schema::table('categories', function (Blueprint $table) {
            // Name columns
            $table->string('name_en')->nullable()->after('name');
            $table->string('name_es')->nullable()->after('name_en');
            $table->string('name_pt')->nullable()->after('name_es');
            
            // Description columns
            $table->text('description_en')->nullable()->after('description');
            $table->text('description_es')->nullable()->after('description_en');
            $table->text('description_pt')->nullable()->after('description_es');
        });

        // Add multilingual columns to series table
        Schema::table('series', function (Blueprint $table) {
            // Title columns
            $table->string('title_en')->nullable()->after('title');
            $table->string('title_es')->nullable()->after('title_en');
            $table->string('title_pt')->nullable()->after('title_es');
            
            // Description columns
            $table->text('description_en')->nullable()->after('description');
            $table->text('description_es')->nullable()->after('description_en');
            $table->text('description_pt')->nullable()->after('description_es');
            
            // Short description columns
            $table->text('short_description_en')->nullable()->after('short_description');
            $table->text('short_description_es')->nullable()->after('short_description_en');
            $table->text('short_description_pt')->nullable()->after('short_description_es');
        });

        // Add multilingual columns to videos table
        Schema::table('videos', function (Blueprint $table) {
            // Title columns
            $table->string('title_en')->nullable()->after('title');
            $table->string('title_es')->nullable()->after('title_en');
            $table->string('title_pt')->nullable()->after('title_es');
            
            // Description columns
            $table->text('description_en')->nullable()->after('description');
            $table->text('description_es')->nullable()->after('description_en');
            $table->text('description_pt')->nullable()->after('description_es');
            
            // Short description columns
            $table->text('short_description_en')->nullable()->after('short_description');
            $table->text('short_description_es')->nullable()->after('short_description_en');
            $table->text('short_description_pt')->nullable()->after('short_description_es');
            
            // Intro description columns (if intro_description column exists)
            if (Schema::hasColumn('videos', 'intro_description')) {
                $table->text('intro_description_en')->nullable()->after('intro_description');
                $table->text('intro_description_es')->nullable()->after('intro_description_en');
                $table->text('intro_description_pt')->nullable()->after('intro_description_es');
            }
        });

        // Migrate existing data from content_translations table
        $this->migrateTranslations();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove multilingual columns from categories table
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn([
                'name_en', 'name_es', 'name_pt',
                'description_en', 'description_es', 'description_pt'
            ]);
        });

        // Remove multilingual columns from series table
        Schema::table('series', function (Blueprint $table) {
            $table->dropColumn([
                'title_en', 'title_es', 'title_pt',
                'description_en', 'description_es', 'description_pt',
                'short_description_en', 'short_description_es', 'short_description_pt'
            ]);
        });

        // Remove multilingual columns from videos table
        Schema::table('videos', function (Blueprint $table) {
            $columnsToDrop = [
                'title_en', 'title_es', 'title_pt',
                'description_en', 'description_es', 'description_pt',
                'short_description_en', 'short_description_es', 'short_description_pt'
            ];
            
            if (Schema::hasColumn('videos', 'intro_description_en')) {
                $columnsToDrop = array_merge($columnsToDrop, [
                    'intro_description_en', 'intro_description_es', 'intro_description_pt'
                ]);
            }
            
            $table->dropColumn($columnsToDrop);
        });
    }

    /**
     * Migrate existing translations from content_translations table
     */
    private function migrateTranslations(): void
    {
        if (!Schema::hasTable('content_translations')) {
            return;
        }

        // Migrate category translations
        $categoryTranslations = DB::table('content_translations')
            ->where('translatable_type', 'App\Models\Category')
            ->get()
            ->groupBy(['translatable_id', 'field']);

        foreach ($categoryTranslations as $categoryId => $fieldGroups) {
            $updates = [];
            
            foreach ($fieldGroups as $field => $translations) {
                foreach ($translations as $translation) {
                    $column = $field . '_' . $translation->locale;
                    if (in_array($column, ['name_en', 'name_es', 'name_pt', 'description_en', 'description_es', 'description_pt'])) {
                        $updates[$column] = $translation->value;
                    }
                }
            }
            
            if (!empty($updates)) {
                // Copy English value from main column if not set
                $category = DB::table('categories')->where('id', $categoryId)->first();
                if ($category) {
                    if (!isset($updates['name_en']) && $category->name) {
                        $updates['name_en'] = $category->name;
                    }
                    if (!isset($updates['description_en']) && $category->description) {
                        $updates['description_en'] = $category->description;
                    }
                    
                    DB::table('categories')
                        ->where('id', $categoryId)
                        ->update($updates);
                }
            }
        }

        // Migrate series translations
        $seriesTranslations = DB::table('content_translations')
            ->where('translatable_type', 'App\Models\Series')
            ->get()
            ->groupBy(['translatable_id', 'field']);

        foreach ($seriesTranslations as $seriesId => $fieldGroups) {
            $updates = [];
            
            foreach ($fieldGroups as $field => $translations) {
                foreach ($translations as $translation) {
                    $column = $field . '_' . $translation->locale;
                    if (in_array($column, [
                        'title_en', 'title_es', 'title_pt',
                        'description_en', 'description_es', 'description_pt',
                        'short_description_en', 'short_description_es', 'short_description_pt'
                    ])) {
                        $updates[$column] = $translation->value;
                    }
                }
            }
            
            if (!empty($updates)) {
                // Copy English value from main column if not set
                $series = DB::table('series')->where('id', $seriesId)->first();
                if ($series) {
                    if (!isset($updates['title_en']) && $series->title) {
                        $updates['title_en'] = $series->title;
                    }
                    if (!isset($updates['description_en']) && $series->description) {
                        $updates['description_en'] = $series->description;
                    }
                    if (!isset($updates['short_description_en']) && $series->short_description) {
                        $updates['short_description_en'] = $series->short_description;
                    }
                    
                    DB::table('series')
                        ->where('id', $seriesId)
                        ->update($updates);
                }
            }
        }

        // Migrate video translations
        $videoTranslations = DB::table('content_translations')
            ->where('translatable_type', 'App\Models\Video')
            ->get()
            ->groupBy(['translatable_id', 'field']);

        foreach ($videoTranslations as $videoId => $fieldGroups) {
            $updates = [];
            
            foreach ($fieldGroups as $field => $translations) {
                foreach ($translations as $translation) {
                    $column = $field . '_' . $translation->locale;
                    if (in_array($column, [
                        'title_en', 'title_es', 'title_pt',
                        'description_en', 'description_es', 'description_pt',
                        'short_description_en', 'short_description_es', 'short_description_pt',
                        'intro_description_en', 'intro_description_es', 'intro_description_pt'
                    ])) {
                        $updates[$column] = $translation->value;
                    }
                }
            }
            
            if (!empty($updates)) {
                // Copy English value from main column if not set
                $video = DB::table('videos')->where('id', $videoId)->first();
                if ($video) {
                    if (!isset($updates['title_en']) && $video->title) {
                        $updates['title_en'] = $video->title;
                    }
                    if (!isset($updates['description_en']) && $video->description) {
                        $updates['description_en'] = $video->description;
                    }
                    if (!isset($updates['short_description_en']) && $video->short_description) {
                        $updates['short_description_en'] = $video->short_description;
                    }
                    if (Schema::hasColumn('videos', 'intro_description') && 
                        !isset($updates['intro_description_en']) && $video->intro_description) {
                        $updates['intro_description_en'] = $video->intro_description;
                    }
                    
                    DB::table('videos')
                        ->where('id', $videoId)
                        ->update($updates);
                }
            }
        }
    }
};
