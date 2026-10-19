<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CalendarEventsRequest;
use App\Models\Task;
use App\Services\CalendarService;
use Illuminate\Http\JsonResponse;

class CalendarController extends Controller
{
    /**
     * Tasks, lead follow-ups and opportunity deadlines between two business-local dates.
     */
    public function index(CalendarEventsRequest $request, CalendarService $calendarService): JsonResponse
    {
        $filters = $request->validated();

        return response()->json([
            'data' => $calendarService->events($request->user(), $filters['start'], $filters['end'], $request->boolean('mine')),
            'today' => Task::businessToday(),
        ]);
    }
}
