<?php

use App\Models\Candidate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
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

test('documents page renders for candidate viewers', function () {
    $this->actingAs(documentUser())
        ->get(route('documents.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('documents/index'));
});

test('documents search returns matching candidates and verification summaries', function () {
    $user = documentUser();
    $candidate = Candidate::query()->create([
        'name' => 'Raisa Chowdhury',
        'email' => 'raisa@example.test',
        'phone' => '+8801711000001',
        'status' => 'Active',
    ]);
    $candidate->documents()->createMany([
        ['name' => 'Passport Copy', 'type' => 'Passport', 'status' => 'Pending', 'uploaded_at' => now()],
        ['name' => 'Academic Transcript', 'type' => 'Transcript', 'status' => 'Verified', 'uploaded_at' => now()],
        ['name' => 'IELTS Result', 'type' => 'IELTS', 'status' => 'Verified', 'uploaded_at' => now()],
    ]);
    $otherCandidate = Candidate::query()->create([
        'name' => 'Farhan Ahmed',
        'status' => 'Active',
    ]);
    $otherCandidate->documents()->create([
        'name' => 'Passport Copy',
        'type' => 'Passport',
        'status' => 'Verified',
        'uploaded_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->getJson('/api/documents?search=Passport')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Farhan Ahmed')
        ->assertJsonPath('data.1.name', 'Raisa Chowdhury')
        ->assertJsonPath('data.1.documents_count', 3)
        ->assertJsonPath('data.1.verified_documents_count', 2);

    $candidateDetails = $this->getJson("/api/candidates/{$candidate->id}")
        ->assertOk()
        ->assertJsonCount(3, 'data.documents')
        ->assertJsonPath('data.documents.0.name', 'Passport Copy');

    expect($response->json('summary.0'))->toMatchArray([
        'label' => 'Personal / KYC',
        'total' => 2,
        'verified' => 1,
        'percent' => 50,
    ])->and($response->json('summary.1'))->toMatchArray([
        'label' => 'Academic',
        'total' => 1,
        'verified' => 1,
        'percent' => 100,
    ]);
});

test('documents page and search require candidate view permission', function () {
    $user = User::query()->create([
        'name' => 'Unprivileged User',
        'email' => 'unprivileged@example.test',
        'password' => bcrypt('password'),
    ]);

    $this->actingAs($user)->get(route('documents.index'))->assertForbidden();
    $this->getJson('/api/documents')->assertForbidden();
});

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
