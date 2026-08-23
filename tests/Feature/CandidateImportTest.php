<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function candidateImportUser(): User
{
    $user = User::query()->create([
        'name' => 'Import Admin',
        'email' => 'candidate-import-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

function candidateCsvUpload(string $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('candidates.csv', $contents);
}

test('the candidate template download contains the expected header row', function () {
    $user = candidateImportUser();

    $response = $this->actingAs($user)->get('/api/candidates/import/template');

    $response->assertOk();
    expect($response->streamedContent())->toContain('name,email,phone,date_of_birth,gender,address,education_level,institution,gpa,passing_year,ielts_score,desired_country,desired_course,desired_intake,status,notes');
});

test('valid candidate rows are imported and counted', function () {
    $user = candidateImportUser();
    $csv = "name,phone\n".
        "Arif Hossain,1711000111\n".
        "Nabila Islam,1812345678\n".
        "Sadia Akter,01711000113\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 3, 'imported' => 3, 'duplicates' => 0, 'failed' => 0]);
    expect(Candidate::query()->count())->toBe(3)
        ->and(Candidate::query()->where('name', 'Arif Hossain')->value('phone'))->toBe('+8801711000111')
        ->and(Candidate::query()->where('name', 'Arif Hossain')->value('status'))->toBe('Active')
        ->and(Candidate::query()->where('name', 'Nabila Islam')->value('phone'))->toBe('+8801812345678')
        ->and(Candidate::query()->where('name', 'Sadia Akter')->value('phone'))->toBe('+8801711000113');
});

test('a candidate is created with the standard workflow progress records', function () {
    $user = candidateImportUser();
    $csv = "name,phone\nArif Hossain,1711000111\n";

    $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $candidate = Candidate::query()->where('name', 'Arif Hossain')->firstOrFail();
    expect($candidate->current_step)->toBe('Application')
        ->and($candidate->progressRecords()->count())->toBe(6);
});

test('invalid Bangladesh phone numbers are reported as failed during candidate import', function () {
    $user = candidateImportUser();
    $csv = "name,email,phone\n".
        "Invalid Prefix,invalid-prefix@example.com,01211000111\n".
        "Invalid Length,invalid-length@example.com,0171100011\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
});

test('candidate rows with missing required fields are reported as failed', function () {
    $user = candidateImportUser();
    $csv = "name,phone\n".
        ",01711000111\n".
        "Missing Phone,\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
    expect(Candidate::query()->count())->toBe(0)
        ->and($response->json('failed_rows.0.row'))->toBe(2)
        ->and($response->json('failed_rows.1.row'))->toBe(3);
});

test('a candidate row matching an existing phone is reported as a duplicate and not imported', function () {
    $user = candidateImportUser();
    Candidate::query()->create(['name' => 'Existing Candidate', 'phone' => '+8801711000111', 'status' => 'Active']);
    $csv = "name,phone\nNew Candidate,01711000111\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 1, 'imported' => 0, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Phone already exists')
        ->and(Candidate::query()->where('phone', '+8801711000111')->count())->toBe(1);
});

test('duplicate phone numbers within the same candidate file are only imported once', function () {
    $user = candidateImportUser();
    $csv = "name,phone\n".
        "First,01711000111\n".
        "Second,1711000111\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 1, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Duplicate phone in file (row 2)')
        ->and(Candidate::query()->where('phone', '+8801711000111')->count())->toBe(1);
});

test('optional candidate fields are imported when provided and left null when omitted', function () {
    $user = candidateImportUser();
    $csv = "name,phone,email,gender,education_level,institution,gpa,passing_year,ielts_score,desired_country,status,notes\n".
        "Full Row,01711000111,full@example.com,Male,Bachelor's Degree,Dhaka University,3.75,2022,7.0,United Kingdom,On Hold,Some notes\n";

    $response = $this->actingAs($user)->post('/api/candidates/import', ['file' => candidateCsvUpload($csv)]);

    $response->assertOk()->assertJson(['imported' => 1]);
    $candidate = Candidate::query()->where('name', 'Full Row')->firstOrFail();
    expect($candidate->email)->toBe('full@example.com')
        ->and($candidate->gender)->toBe('Male')
        ->and((string) $candidate->gpa)->toBe('3.75')
        ->and($candidate->status)->toBe('On Hold')
        ->and($candidate->notes)->toBe('Some notes');
});
