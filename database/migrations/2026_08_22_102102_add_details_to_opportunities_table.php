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
        Schema::table('opportunities', function (Blueprint $table) {
            $table->string('title')->nullable()->after('university_id');
            $table->string('level')->nullable()->after('program');
            $table->string('intake')->nullable()->after('level');
            $table->date('deadline')->nullable()->after('intake');
            $table->decimal('tuition_fee', 10, 2)->nullable()->after('deadline');
            $table->string('currency', 3)->default('USD')->after('tuition_fee');
            $table->text('scholarship')->nullable()->after('currency');
            $table->text('requirements')->nullable()->after('scholarship');
            $table->string('status')->default('Open')->after('requirements');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn(['title', 'level', 'intake', 'deadline', 'tuition_fee', 'currency', 'scholarship', 'requirements', 'status']);
        });
    }
};
