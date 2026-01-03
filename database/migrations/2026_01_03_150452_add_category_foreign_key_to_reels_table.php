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
            // Add foreign key constraint if category_id column exists
            if (Schema::hasColumn('reels', 'category_id')) {
                $table->foreign('category_id')
                      ->references('id')
                      ->on('reel_categories')
                      ->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reels', function (Blueprint $table) {
            if (Schema::hasColumn('reels', 'category_id')) {
                $table->dropForeign(['category_id']);
            }
        });
    }
};
