<?php

use App\Enums\RoleEnum;
use App\Models\Opportunity;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function opportunityImportUser(): User
{
    $user = User::query()->create([
        'name' => 'Import Admin',
        'email' => 'opportunity-import-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

function opportunityCsvUpload(string $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('programs.csv', $contents);
}

test('the program template download contains the expected header row', function () {
    $user = opportunityImportUser();

    $response = $this->actingAs($user)->get('/api/opportunities/import/template');

    $response->assertOk();
    expect($response->streamedContent())->toContain('university,title,program,level,intake,deadline,tuition_fee,currency,scholarship,requirements,status');
});

test('valid program rows are imported and counted', function () {
    $user = opportunityImportUser();
    University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    $csv = "university,title\n".
        "University of Toronto,Bachelor of Computer Science\n".
        "University of Toronto,Master of Data Science\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 2, 'duplicates' => 0, 'failed' => 0]);
    expect(Opportunity::query()->count())->toBe(2)
        ->and(Opportunity::query()->where('title', 'Bachelor of Computer Science')->value('status'))->toBe('Open')
        ->and(Opportunity::query()->where('title', 'Bachelor of Computer Science')->value('currency'))->toBe('USD');
});

test('a program row referencing an unknown university is reported as failed', function () {
    $user = opportunityImportUser();
    $csv = "university,title\nUnknown University,Bachelor of Computer Science\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 1, 'imported' => 0, 'failed' => 1]);
    expect($response->json('failed_rows.0.errors.0'))->toBe('University not found: Unknown University');
});

test('program rows with missing required fields are reported as failed', function () {
    $user = opportunityImportUser();
    University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    $csv = "university,title\n".
        ",Bachelor of Computer Science\n".
        "University of Toronto,\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
    expect(Opportunity::query()->count())->toBe(0);
});

test('a program row matching an existing title for the same university is reported as a duplicate', function () {
    $user = opportunityImportUser();
    $university = University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Bachelor of Computer Science', 'status' => 'Open', 'currency' => 'USD']);
    $csv = "university,title\nUniversity of Toronto,Bachelor of Computer Science\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 1, 'imported' => 0, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Program already exists for this university')
        ->and(Opportunity::query()->count())->toBe(1);
});

test('duplicate program titles within the same file for the same university are only imported once', function () {
    $user = opportunityImportUser();
    University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    $csv = "university,title\n".
        "University of Toronto,Bachelor of Computer Science\n".
        "University of Toronto,bachelor of computer science\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 1, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Duplicate program in file (row 2)')
        ->and(Opportunity::query()->count())->toBe(1);
});

test('optional program fields are imported when provided', function () {
    $user = opportunityImportUser();
    University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    $csv = "university,title,program,level,intake,deadline,tuition_fee,currency,scholarship,requirements,status\n".
        "University of Toronto,Bachelor of Computer Science,Computer Science,Bachelor,Fall 2026,2026-06-30,25000,gbp,50% waiver,IELTS 6.5+,Limited\n";

    $response = $this->actingAs($user)->post('/api/opportunities/import', ['file' => opportunityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['imported' => 1]);
    $opportunity = Opportunity::query()->where('title', 'Bachelor of Computer Science')->firstOrFail();
    expect($opportunity->program)->toBe('Computer Science')
        ->and($opportunity->level)->toBe('Bachelor')
        ->and($opportunity->currency)->toBe('GBP')
        ->and($opportunity->status)->toBe('Limited')
        ->and((string) $opportunity->tuition_fee)->toBe('25000.00');
});
