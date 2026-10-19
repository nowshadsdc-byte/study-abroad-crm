<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\CandidateApplication;
use App\Models\CandidateProgress;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\University;
use Carbon\CarbonImmutable;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    config(['app.business_timezone' => 'Asia/Dhaka']);
    // 19 Oct 2026, midday in Dhaka.
    $this->travelTo(CarbonImmutable::parse('2026-10-19 06:00:00', 'UTC'));
});

function reportLead(string $source, string $status, string $createdAtUtc): Lead
{
    $lead = Lead::query()->create(['name' => "{$source} lead", 'source' => $source, 'status' => $status, 'priority' => 'Medium']);
    $lead->forceFill(['created_at' => $createdAtUtc])->save();

    return $lead;
}

function reportClient(?Lead $lead, ?string $country, string $createdAtUtc): Candidate
{
    $candidate = Candidate::query()->create(['name' => 'Client', 'status' => 'Active', 'lead_id' => $lead?->id, 'desired_country' => $country]);
    $candidate->forceFill(['created_at' => $createdAtUtc])->save();

    return $candidate;
}

function reportPayment(?Candidate $candidate, float $amount, string $paidAt): void
{
    $invoice = Invoice::query()->create([
        'candidate_id' => $candidate?->id,
        'invoice_number' => 'INV-'.fake()->unique()->numerify('####'),
        'client_name' => 'Client',
        'issue_date' => $paidAt,
        'due_date' => $paidAt,
        'subtotal' => $amount,
        'discount_amount' => 0,
        'tax_rate' => 0,
        'tax_amount' => 0,
        'total' => $amount,
        'amount_paid' => $amount,
        'status' => 'Paid',
    ]);
    InvoicePayment::query()->create(['invoice_id' => $invoice->id, 'amount' => $amount, 'method' => 'Cash', 'paid_at' => $paidAt]);
}

/**
 * One converted Facebook lead that went all the way to enrolment, plus leads and
 * clients around the year boundary.
 */
function seedReportData(): void
{
    $converted = reportLead('Facebook', 'Converted', '2026-03-01 04:00:00');
    reportLead('Facebook', 'Contacted', '2026-05-01 04:00:00');
    reportLead('Walk-in', 'New', '2026-07-01 04:00:00');
    reportLead('Website', 'Qualified', '2025-12-31 19:00:00'); // 1 Jan 2026, 01:00 in Dhaka
    reportLead('Website', 'Lost', '2025-12-31 17:00:00'); // 31 Dec 2025, 23:00 in Dhaka

    $client = reportClient($converted, 'Canada', '2026-03-05 04:00:00');
    $university = University::query()->create(['name' => 'Test University', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'MSc', 'status' => 'Open']);
    CandidateApplication::query()->create(['candidate_id' => $client->id, 'opportunity_id' => $opportunity->id, 'status' => 'Submitted', 'applied_at' => '2026-04-02 04:00:00']);
    CandidateProgress::query()->create(['candidate_id' => $client->id, 'step' => 'Offer', 'status' => 'Completed', 'completed_at' => '2026-05-01 04:00:00']);
    CandidateProgress::query()->create(['candidate_id' => $client->id, 'step' => 'Visa', 'status' => 'Completed', 'outcome' => 'Approved', 'completed_at' => '2026-06-01 04:00:00']);
    CandidateProgress::query()->create(['candidate_id' => $client->id, 'step' => 'Enrollment', 'status' => 'Completed', 'completed_at' => '2026-07-01 04:00:00']);
    reportPayment($client, 50000, '2026-04-01');

    $directClient = reportClient(null, null, '2026-08-01 04:00:00');
    CandidateProgress::query()->create(['candidate_id' => $directClient->id, 'step' => 'Visa', 'status' => 'Completed', 'outcome' => 'Refused', 'completed_at' => '2026-09-01 04:00:00']);

    reportPayment(null, 10000, '2025-06-01');
}

test('the reports page renders for managers and finance officers', function (RoleEnum $role) {
    $this->actingAs(taskStaff($role))
        ->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('reports/index'));
})->with([RoleEnum::Manager, RoleEnum::FinanceOfficer]);

test('counselors and receptionists cannot open reports', function (RoleEnum $role) {
    $this->actingAs(taskStaff($role))->get(route('reports.index'))->assertForbidden();
    $this->getJson('/api/reports')->assertForbidden();
})->with([RoleEnum::Counselor, RoleEnum::Receptionist]);

test('the period must be a known option', function () {
    $this->actingAs(taskStaff(RoleEnum::Manager))
        ->getJson('/api/reports?period=forever')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['period']);
});

test('year to date kpis only count records inside the business-local period', function () {
    seedReportData();

    $this->actingAs(taskStaff(RoleEnum::Manager))
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonPath('data.period', ['key' => 'year_to_date', 'label' => 'Year to date', 'from' => '2026-01-01', 'to' => '2026-10-19'])
        ->assertJsonPath('data.generated_at', '2026-10-19')
        ->assertJsonPath('data.kpis', [
            'leads' => 4,
            'converted' => 1,
            'conversion_rate' => 25,
            'clients' => 2,
            'applications_lodged' => 1,
            'visa_approved' => 1,
            'visa_refused' => 1,
            'visa_rate' => 50,
            'collections' => 50000,
        ]);
});

test('last year picks up the lead captured just before midnight in dhaka', function () {
    seedReportData();

    $this->actingAs(taskStaff(RoleEnum::Manager))
        ->getJson('/api/reports?period=last_year')
        ->assertOk()
        ->assertJsonPath('data.kpis.leads', 1)
        ->assertJsonPath('data.kpis.collections', 10000)
        ->assertJsonPath('data.kpis.visa_rate', null);
});

test('acquisition channels show leads, converted and paid clients per source', function () {
    seedReportData();

    $this->actingAs(taskStaff(RoleEnum::FinanceOfficer))
        ->getJson('/api/reports?period=year_to_date')
        ->assertOk()
        ->assertJsonPath('data.channels', [
            ['source' => 'Facebook', 'leads' => 2, 'converted' => 1, 'paid_clients' => 1, 'conversion_rate' => 50, 'efficiency' => 50],
            ['source' => 'Walk-in', 'leads' => 1, 'converted' => 0, 'paid_clients' => 0, 'conversion_rate' => 0, 'efficiency' => 0],
            ['source' => 'Website', 'leads' => 1, 'converted' => 0, 'paid_clients' => 0, 'conversion_rate' => 0, 'efficiency' => 0],
        ]);
});

test('the funnel follows the period lead cohort through every stage', function () {
    seedReportData();

    $funnel = $this->actingAs(taskStaff(RoleEnum::Manager))->getJson('/api/reports')->assertOk()->json('data.funnel');

    expect(array_column($funnel, 'count', 'stage'))->toBe([
        'Leads captured' => 4,
        'Contacted' => 3,
        'Qualified' => 2,
        'Converted to client' => 1,
        'Application lodged' => 1,
        'Offer received' => 1,
        'Visa approved' => 1,
        'Enrolled' => 1,
    ])
        ->and($funnel[1]['rate_of_leads'])->toEqual(75)
        ->and($funnel[3]['rate_of_previous'])->toEqual(50)
        ->and($funnel[0]['rate_of_previous'])->toBeNull();
});

test('destinations group clients by desired country with visa outcomes and collections', function () {
    seedReportData();

    $this->actingAs(taskStaff(RoleEnum::Manager))
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonPath('data.destinations', [
            ['country' => 'Canada', 'clients' => 1, 'lodged' => 1, 'visa_approved' => 1, 'visa_refused' => 0, 'visa_rate' => 100, 'collections' => 50000],
            ['country' => 'Not specified', 'clients' => 1, 'lodged' => 0, 'visa_approved' => 0, 'visa_refused' => 1, 'visa_rate' => 0, 'collections' => 0],
        ]);
});

test('an empty period returns zeroes and null rates', function () {
    $this->actingAs(taskStaff(RoleEnum::Manager))
        ->getJson('/api/reports?period=this_month')
        ->assertOk()
        ->assertJsonPath('data.kpis.leads', 0)
        ->assertJsonPath('data.kpis.conversion_rate', null)
        ->assertJsonPath('data.kpis.visa_rate', null)
        ->assertJsonPath('data.channels', [])
        ->assertJsonPath('data.destinations', []);
});
