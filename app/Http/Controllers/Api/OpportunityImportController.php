<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Opportunity;
use App\Services\OpportunityImportService;
use App\Services\OpportunityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OpportunityImportController extends Controller
{
    /**
     * Download the CSV template used to bulk-import programs.
     */
    public function template(OpportunityImportService $opportunityImportService): StreamedResponse
    {
        Gate::authorize('create', Opportunity::class);

        return response()->streamDownload(function () use ($opportunityImportService) {
            echo $opportunityImportService->template();
        }, 'program_template.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Validate, de-duplicate, and import programs from an uploaded CSV file.
     */
    public function import(Request $request, OpportunityImportService $opportunityImportService, OpportunityService $opportunityService): JsonResponse
    {
        Gate::authorize('create', Opportunity::class);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json($opportunityImportService->import($request->file('file'), $opportunityService));
    }
}
