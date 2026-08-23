<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Services\CandidateImportService;
use App\Services\CandidateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateImportController extends Controller
{
    /**
     * Download the CSV template used to bulk-import candidates.
     */
    public function template(CandidateImportService $candidateImportService): StreamedResponse
    {
        Gate::authorize('create', Candidate::class);

        return response()->streamDownload(function () use ($candidateImportService) {
            echo $candidateImportService->template();
        }, 'candidate_template.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Validate, de-duplicate, and import candidates from an uploaded CSV file.
     */
    public function import(Request $request, CandidateImportService $candidateImportService, CandidateService $candidateService): JsonResponse
    {
        Gate::authorize('create', Candidate::class);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json($candidateImportService->import($request->file('file'), $request->user(), $candidateService));
    }
}
