<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportRequest;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    /**
     * KPIs, acquisition channels, the agency funnel and destinations for a period.
     */
    public function index(ReportRequest $request, ReportService $reportService): JsonResponse
    {
        return response()->json(['data' => $reportService->build($request->period())]);
    }
}
