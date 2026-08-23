<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\University;
use App\Services\UniversityImportService;
use App\Services\UniversityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UniversityImportController extends Controller
{
    /**
     * Download the CSV template used to bulk-import universities.
     */
    public function template(UniversityImportService $universityImportService): StreamedResponse
    {
        Gate::authorize('create', University::class);

        return response()->streamDownload(function () use ($universityImportService) {
            echo $universityImportService->template();
        }, 'university_template.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Validate, de-duplicate, and import universities from an uploaded CSV file.
     */
    public function import(Request $request, UniversityImportService $universityImportService, UniversityService $universityService): JsonResponse
    {
        Gate::authorize('create', University::class);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json($universityImportService->import($request->file('file'), $universityService));
    }
}
