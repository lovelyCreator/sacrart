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
        Schema::table('rewinds', function (Blueprint $table) {
            $table->year('year')->nullable()->after('title');
            $table->index('year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rewinds', function (Blueprint $table) {
            $table->dropIndex(['year']);
            $table->dropColumn('year');
        });
    }
};
