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
        Schema::table('universities', function (Blueprint $table) {
            $table->string('city')->nullable()->after('country');
            $table->string('website')->nullable()->after('city');
            $table->unsignedInteger('ranking')->nullable()->after('website');
            $table->string('logo_url')->nullable()->after('ranking');
            $table->text('description')->nullable()->after('logo_url');
            $table->json('programs')->nullable()->after('description');
            $table->unique('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->dropColumn(['city', 'website', 'ranking', 'logo_url', 'description', 'programs']);
        });
    }
};
