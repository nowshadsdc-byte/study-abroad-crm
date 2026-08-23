<?php

use App\Enums\RoleEnum;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function leadImportUser(): User
{
    $user = User::query()->create([
        'name' => 'Import Admin',
        'email' => 'import-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

function csvUpload(string $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('leads.csv', $contents);
}

test('the template download contains the expected header row', function () {
    $user = leadImportUser();

    $response = $this->actingAs($user)->get('/api/leads/import/template');

    $response->assertOk();
    expect($response->streamedContent())->toContain('name,email,phone,address,source,interest_country,interest_course,interest_intake,status,priority,budget,notes');
});

test('valid rows are imported and counted', function () {
    $user = leadImportUser();
    $csv = "name,phone\n".
        "Arif Hossain,1711000111\n".
        "Nabila Islam,1812345678\n".
        "Sadia Akter,01711000113\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 3, 'imported' => 3, 'duplicates' => 0, 'failed' => 0]);
    expect(Lead::query()->count())->toBe(3)
        ->and(Lead::query()->where('name', 'Arif Hossain')->value('phone'))->toBe('+8801711000111')
        ->and(Lead::query()->where('name', 'Arif Hossain')->value('source'))->toBe('Website')
        ->and(Lead::query()->where('name', 'Nabila Islam')->value('phone'))->toBe('+8801812345678')
        ->and(Lead::query()->where('name', 'Sadia Akter')->value('phone'))->toBe('+8801711000113');
});

test('invalid Bangladesh phone numbers are reported as failed during import', function () {
    $user = leadImportUser();
    $csv = "name,email,phone,source,status,priority\n".
        "Invalid Prefix,invalid-prefix@example.com,01211000111,Website,New,High\n".
        "Invalid Length,invalid-length@example.com,0171100011,Website,New,High\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
});

test('rows with missing or invalid required fields are reported as failed', function () {
    $user = leadImportUser();
    $csv = "name,phone\n".
        ",01711000111\n".
        "Missing Phone,\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
    expect(Lead::query()->count())->toBe(0)
        ->and($response->json('failed_rows.0.row'))->toBe(2)
        ->and($response->json('failed_rows.1.row'))->toBe(3);
});

test('a row matching an existing lead email is reported as a duplicate and not imported', function () {
    $user = leadImportUser();
    Lead::query()->create(['name' => 'Existing Lead', 'email' => 'existing@example.com', 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium']);
    $csv = "name,email,phone,source,status,priority\n".
        "New Lead,existing@example.com,01711000111,Website,New,High\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 1, 'imported' => 0, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Email already exists')
        ->and(Lead::query()->where('email', 'existing@example.com')->count())->toBe(1);
});

test('duplicate emails within the same file are only imported once', function () {
    $user = leadImportUser();
    $csv = "name,email,phone,source,status,priority\n".
        "First,dup@example.com,01711000111,Website,New,High\n".
        "Second,dup@example.com,01711000112,Referral,New,Medium\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 1, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Duplicate email in file (row 2)')
        ->and(Lead::query()->where('email', 'dup@example.com')->count())->toBe(1);
});

test('a soft-deleted lead does not block re-importing the same email', function () {
    $user = leadImportUser();
    $lead = Lead::query()->create(['name' => 'Archived Lead', 'email' => 'archived@example.com', 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium']);
    $lead->delete();
    $csv = "name,email,phone,source,status,priority\n".
        "Reimported,archived@example.com,01711000111,Website,New,High\n";

    $response = $this->actingAs($user)->post('/api/leads/import', ['file' => csvUpload($csv)]);

    $response->assertOk()->assertJson(['imported' => 1, 'duplicates' => 0]);
    expect(Lead::query()->where('email', 'archived@example.com')->count())->toBe(1);
});
