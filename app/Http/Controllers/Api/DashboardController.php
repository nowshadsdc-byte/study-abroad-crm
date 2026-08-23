<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\University;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Summary metrics powering the dashboard's clickable overview cards.
     */
    public function metrics(): JsonResponse
    {
        return response()->json([
            'data' => [
                'total_leads' => Lead::query()->count(),
                'new_leads' => Lead::query()->where('status', 'New')->count(),
                'followup_leads' => Lead::query()
                    ->whereNotIn('status', ['Converted', 'Lost'])
                    ->whereHas('followUps', fn ($query) => $query->whereDate('next_follow_up_date', '<=', today()))
                    ->count(),
                'total_candidates' => Candidate::query()->count(),
                'completed_candidates' => Candidate::query()->where('status', 'Completed')->count(),
                'active_programs' => Opportunity::query()->where('status', 'Open')->count(),
                'active_universities' => University::query()->where('is_active', true)->count(),
                'total_users' => User::query()->count(),
            ],
        ]);
    }
}
