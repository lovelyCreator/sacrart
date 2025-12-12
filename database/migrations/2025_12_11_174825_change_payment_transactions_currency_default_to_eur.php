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
        // Change the default value of currency column from USD to EUR
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('currency', 3)->default('EUR')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to USD if needed
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('currency', 3)->default('USD')->change();
        });
    }
};
