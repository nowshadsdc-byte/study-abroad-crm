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
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['number', 'issued_at']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->unique()->after('candidate_id');
            $table->string('client_name')->nullable()->after('invoice_number');
            $table->string('client_email')->nullable()->after('client_name');
            $table->string('client_phone')->nullable()->after('client_email');
            $table->text('client_address')->nullable()->after('client_phone');
            $table->date('issue_date')->nullable()->after('client_address');
            $table->date('due_date')->nullable()->after('issue_date');
            $table->decimal('subtotal', 12, 2)->default(0)->after('due_date');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('tax_rate', 5, 2)->default(0)->after('discount_amount');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('tax_rate');
            $table->decimal('amount_paid', 12, 2)->default(0)->after('total');
            $table->text('notes')->nullable()->after('status');
            $table->foreignId('created_by_id')->nullable()->after('notes')->constrained('users')->nullOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('status')->default('Unpaid')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by_id']);
            $table->dropColumn([
                'invoice_number', 'client_name', 'client_email', 'client_phone', 'client_address',
                'issue_date', 'due_date', 'subtotal', 'discount_amount', 'tax_rate', 'tax_amount',
                'amount_paid', 'notes', 'created_by_id',
            ]);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('status')->default('Draft')->change();
            $table->string('number')->nullable();
            $table->date('issued_at')->nullable();
        });
    }
};
