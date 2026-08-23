<?php

use App\Enums\RoleEnum;
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

function universityImportUser(): User
{
    $user = User::query()->create([
        'name' => 'Import Admin',
        'email' => 'university-import-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

function universityCsvUpload(string $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('universities.csv', $contents);
}

test('the university template download contains the expected header row', function () {
    $user = universityImportUser();

    $response = $this->actingAs($user)->get('/api/universities/import/template');

    $response->assertOk();
    expect($response->streamedContent())->toContain('name,country,city,website,ranking,logo_url,description,programs');
});

test('valid university rows are imported and counted', function () {
    $user = universityImportUser();
    $csv = "name,country\n".
        "University of Toronto,Canada\n".
        "University of Melbourne,Australia\n";

    $response = $this->actingAs($user)->post('/api/universities/import', ['file' => universityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 2, 'duplicates' => 0, 'failed' => 0]);
    expect(University::query()->count())->toBe(2)
        ->and(University::query()->where('name', 'University of Toronto')->value('country'))->toBe('Canada');
});

test('university rows with a comma separated programs column are imported', function () {
    $user = universityImportUser();
    $csv = "name,country,programs\n".
        "University of Toronto,Canada,\"Computer Science, Business, Engineering\"\n";

    $response = $this->actingAs($user)->post('/api/universities/import', ['file' => universityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['imported' => 1]);
    $university = University::query()->where('name', 'University of Toronto')->firstOrFail();
    expect($university->programs)->toBe(['Computer Science', 'Business', 'Engineering']);
});

test('university rows with missing required fields are reported as failed', function () {
    $user = universityImportUser();
    $csv = "name,country\n".
        ",Canada\n".
        "Missing Country,\n";

    $response = $this->actingAs($user)->post('/api/universities/import', ['file' => universityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 0, 'failed' => 2]);
    expect(University::query()->count())->toBe(0)
        ->and($response->json('failed_rows.0.row'))->toBe(2)
        ->and($response->json('failed_rows.1.row'))->toBe(3);
});

test('a university row matching an existing name is reported as a duplicate and not imported', function () {
    $user = universityImportUser();
    University::query()->create(['name' => 'University of Toronto', 'country' => 'Canada']);
    $csv = "name,country\nUniversity of Toronto,Canada\n";

    $response = $this->actingAs($user)->post('/api/universities/import', ['file' => universityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 1, 'imported' => 0, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('University name already exists')
        ->and(University::query()->where('name', 'University of Toronto')->count())->toBe(1);
});

test('duplicate university names within the same file are only imported once', function () {
    $user = universityImportUser();
    $csv = "name,country\n".
        "University of Toronto,Canada\n".
        "university of toronto,Canada\n";

    $response = $this->actingAs($user)->post('/api/universities/import', ['file' => universityCsvUpload($csv)]);

    $response->assertOk()->assertJson(['total' => 2, 'imported' => 1, 'duplicates' => 1]);
    expect($response->json('duplicate_rows.0.reason'))->toBe('Duplicate university name in file (row 2)')
        ->and(University::query()->count())->toBe(1);
});
