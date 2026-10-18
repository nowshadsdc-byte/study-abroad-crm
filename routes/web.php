<?php

use App\Models\Candidate;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\University;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');
Route::inertia('test', 'welcome')->name('test');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->middleware('permission:dashboard.view')->name('dashboard');
    Route::inertia('my-day', 'my-day/index')->middleware('permission:task.view')->name('my-day');

    Route::inertia('leads', 'leads/index')->middleware('permission:lead.view')->name('leads.index');
    Route::get('leads/{lead}', fn (Lead $lead) => Inertia::render('leads/show', ['leadId' => $lead->id]))->middleware('permission:lead.view')->name('leads.show');
    Route::inertia('candidates', 'candidates/index')->middleware('permission:candidate.view')->name('candidates.index');
    Route::get('candidates/{candidate}', fn (Candidate $candidate) => Inertia::render('candidates/show', ['candidateId' => $candidate->id]))->middleware('permission:candidate.view')->name('candidates.show');
    Route::inertia('finance', 'finance/index')->middleware('permission:finance.view')->name('finance.index');
    Route::get('finance/{invoice}', fn (Invoice $invoice) => Inertia::render('finance/show', ['invoiceId' => $invoice->id]))->middleware('permission:finance.view')->name('finance.show');
    Route::inertia('opportunities', 'opportunities/index')->middleware('permission:opportunity.view')->name('opportunities.index');
    Route::get('opportunities/{opportunity}', fn (Opportunity $opportunity) => Inertia::render('opportunities/show', ['opportunityId' => $opportunity->id]))->middleware('permission:opportunity.view')->name('opportunities.show');
    Route::get('universities/{university}', fn (University $university) => Inertia::render('universities/show', ['universityId' => $university->id]))->middleware('permission:opportunity.view')->name('universities.show');
});

require __DIR__.'/settings.php';
