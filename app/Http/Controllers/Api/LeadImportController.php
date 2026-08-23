<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\LeadImportService;
use App\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadImportController extends Controller
{
    /**
     * Download the CSV template used to bulk-import leads.
     */
    public function template(LeadImportService $leadImportService): StreamedResponse
    {
        Gate::authorize('create', Lead::class);

        return response()->streamDownload(function () use ($leadImportService) {
            echo $leadImportService->template();
        }, 'lead_template.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Validate, de-duplicate, and import leads from an uploaded CSV file.
     */
    public function import(Request $request, LeadImportService $leadImportService, LeadService $leadService): JsonResponse
    {
        Gate::authorize('create', Lead::class);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json($leadImportService->import($request->file('file'), $request->user(), $leadService));
    }
}
