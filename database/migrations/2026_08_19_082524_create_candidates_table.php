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
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->text('address')->nullable();
            $table->string('education_level')->nullable();
            $table->string('institution')->nullable();
            $table->decimal('gpa', 3, 2)->nullable();
            $table->unsignedSmallInteger('passing_year')->nullable();
            $table->decimal('ielts_score', 3, 1)->nullable();
            $table->string('desired_country')->nullable()->index();
            $table->string('desired_course')->nullable();
            $table->string('desired_intake')->nullable();
            $table->string('current_step')->default('Application')->index();
            $table->string('status')->default('Active')->index();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidates');
    }
};
