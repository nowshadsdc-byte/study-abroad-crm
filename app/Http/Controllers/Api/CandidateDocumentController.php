<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateDocumentController extends Controller
{
    public function store(Request $request, Candidate $candidate): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:50'],
            'file' => ['required', 'file', 'max:10240'], // max 10MB
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $path = $request->file('file')->store('candidate-documents', 'public');

        $candidate->documents()->create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'file_url' => Storage::disk('public')->url($path),
            'status' => 'Pending',
            'notes' => $validated['notes'] ?? null,
            'uploaded_at' => now(),
        ]);

        return redirect()->route('candidates.show', $candidate);
    }

    public function download(Candidate $candidate, CandidateDocument $document): StreamedResponse
    {
        abort_unless($document->candidate_id === $candidate->id, 404);

        $path = $this->resolveStoragePath($document);
        abort_unless($path && Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->download($path, $this->documentFilename($document, $path));
    }

    public function preview(Candidate $candidate, CandidateDocument $document): StreamedResponse
    {
        abort_unless($document->candidate_id === $candidate->id, 404);

        $path = $this->resolveStoragePath($document);
        abort_unless($path && Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->response($path, $this->documentFilename($document, $path));
    }

    public function update(Request $request, Candidate $candidate, CandidateDocument $document): JsonResponse
    {
        abort_unless($document->candidate_id === $candidate->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'in:Pending,Verified,Rejected'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $document->update($validated);

        return response()->json([
            'data' => $document->fresh(),
        ]);
    }

    public function destroy(Candidate $candidate, CandidateDocument $document): JsonResponse
    {
        abort_unless($document->candidate_id === $candidate->id, 404);

        $path = $this->resolveStoragePath($document);
        if ($path) {
            Storage::disk('public')->delete($path);
        }

        $document->delete();

        return response()->json(status: 204);
    }

    private function resolveStoragePath(CandidateDocument $document): ?string
    {
        if (! $document->file_url) {
            return null;
        }

        $prefix = Storage::disk('public')->url('');

        return ltrim(str_replace($prefix, '', $document->file_url), '/');
    }

    private function documentFilename(CandidateDocument $document, string $path): string
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $name = Str::slug($document->name, '-') ?: 'document';

        return $extension ? "{$name}.{$extension}" : $name;
    }
}
