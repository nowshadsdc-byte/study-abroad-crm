<?php

use App\Models\Candidate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function documentUser(): User
{
    $permissions = ['candidate.view', 'candidate.edit', 'candidate.delete'];
    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }
    $role = Role::findOrCreate('Administrator', 'web');
    $role->syncPermissions($permissions);
    $user = User::query()->create([
        'name' => 'Document Administrator',
        'email' => 'document-admin@example.test',
        'password' => bcrypt('password'),
    ]);
    $user->assignRole($role);

    return $user;
}

test('uploading a document redirects back to the candidate profile page', function () {
    Storage::fake('public');
    $user = documentUser();
    $candidate = Candidate::query()->create(['name' => 'Raisa Chowdhury', 'status' => 'Active']);

    $response = $this->actingAs($user)->post("/api/candidates/{$candidate->id}/documents", [
        'name' => 'Passport Copy',
        'type' => 'Passport',
        'file' => UploadedFile::fake()->create('passport.pdf', 100, 'application/pdf'),
    ]);

    $response->assertRedirect(route('candidates.show', $candidate));
    expect($candidate->documents()->count())->toBe(1);
});

test('an uploaded document can be downloaded as an attachment', function () {
    Storage::fake('public');
    $user = documentUser();
    $candidate = Candidate::query()->create(['name' => 'Raisa Chowdhury', 'status' => 'Active']);
    $path = UploadedFile::fake()->create('passport.pdf', 100, 'application/pdf')->store('candidate-documents', 'public');
    $document = $candidate->documents()->create([
        'name' => 'Passport Copy',
        'type' => 'Passport',
        'file_url' => Storage::disk('public')->url($path),
        'status' => 'Pending',
        'uploaded_at' => now(),
    ]);

    $response = $this->actingAs($user)->get("/api/candidates/{$candidate->id}/documents/{$document->id}/download");

    $response->assertOk();
    $response->assertHeader('content-disposition');
    expect($response->headers->get('content-disposition'))->toContain('attachment');
});

test('an uploaded pdf document can be previewed inline', function () {
    Storage::fake('public');
    $user = documentUser();
    $candidate = Candidate::query()->create(['name' => 'Raisa Chowdhury', 'status' => 'Active']);
    $path = UploadedFile::fake()->create('passport.pdf', 100, 'application/pdf')->store('candidate-documents', 'public');
    $document = $candidate->documents()->create([
        'name' => 'Passport Copy',
        'type' => 'Passport',
        'file_url' => Storage::disk('public')->url($path),
        'status' => 'Pending',
        'uploaded_at' => now(),
    ]);

    $response = $this->actingAs($user)->get("/api/candidates/{$candidate->id}/documents/{$document->id}/preview");

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('inline');
});

test('downloading a document that belongs to another candidate is not found', function () {
    Storage::fake('public');
    $user = documentUser();
    $candidate = Candidate::query()->create(['name' => 'Raisa Chowdhury', 'status' => 'Active']);
    $otherCandidate = Candidate::query()->create(['name' => 'Other Candidate', 'status' => 'Active']);
    $path = UploadedFile::fake()->create('passport.pdf', 100, 'application/pdf')->store('candidate-documents', 'public');
    $document = $otherCandidate->documents()->create([
        'name' => 'Passport Copy',
        'type' => 'Passport',
        'file_url' => Storage::disk('public')->url($path),
        'status' => 'Pending',
        'uploaded_at' => now(),
    ]);

    $this->actingAs($user)->get("/api/candidates/{$candidate->id}/documents/{$document->id}/download")->assertNotFound();
});
