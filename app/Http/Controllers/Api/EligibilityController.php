<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EvaluateEligibilityRequest;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\User;
use App\Services\EligibilityMatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EligibilityController extends Controller
{
    private const STATUS_RANK = ['Eligible' => 0, 'Needs Review' => 1, 'Not Eligible' => 2];

    /**
     * The academic profile used to pre-fill the matcher.
     */
    public function student(Request $request, string $type, int $id): JsonResponse
    {
        $student = $this->studentProfile($request->user(), $type, $id);

        return response()->json(['data' => $student]);
    }

    /**
     * Evaluate every open programme against the student's (optionally overridden) credentials, best matches first.
     */
    public function evaluate(
        EvaluateEligibilityRequest $request,
        EligibilityMatcher $matcher,
    ): JsonResponse {
        $filters = $request->validated();
        $student = $this->studentProfile(
            $request->user(),
            $filters['student_type'],
            $filters['student_id'],
        );
        $credentials = [
            'ielts_score' => $filters['ielts_score'] ?? $student['credentials']['ielts_score'],
            'gpa' => $filters['gpa'] ?? $student['credentials']['gpa'],
            'study_gap_years' => $filters['study_gap_years'] ?? null,
        ];
        $educationLevel = $filters['education_level'] ?? $student['credentials']['education_level'];

        // Every open programme is evaluated so the best matches can be ranked first across all pages.
        $programmes = Opportunity::query()
            ->whereIn('status', ['Open', 'Limited'])
            ->with('university:id,name,country')
            ->orderBy('id')
            ->get()
            ->map(function (Opportunity $opportunity) use ($matcher, $credentials, $educationLevel): array {
                $evaluation = $matcher->evaluate(
                    $opportunity->eligibility_criteria ?? [],
                    $opportunity->requirements,
                    $credentials,
                    $educationLevel,
                );

                return [
                    'id' => $opportunity->id,
                    'title' => $opportunity->title,
                    'program' => $opportunity->program,
                    'level' => $opportunity->level,
                    'university' => $opportunity->university?->name,
                    'country' => $opportunity->university?->country,
                    'status' => $evaluation['status'],
                    'checks' => $evaluation['checks'],
                ];
            })
            ->sortBy(fn (array $programme): int => self::STATUS_RANK[$programme['status']])
            ->values();

        $perPage = (int) ($filters['per_page'] ?? 24);
        $total = $programmes->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($filters['page'] ?? 1), $lastPage);
        $statusCounts = $programmes->countBy('status');

        return response()->json([
            'data' => $programmes->forPage($page, $perPage)->values(),
            'student' => ['type' => $student['type'], 'id' => $student['id'], 'name' => $student['name']],
            'matches_count' => $statusCounts->get('Eligible', 0),
            'status_counts' => [
                'Eligible' => $statusCounts->get('Eligible', 0),
                'Needs Review' => $statusCounts->get('Needs Review', 0),
                'Not Eligible' => $statusCounts->get('Not Eligible', 0),
            ],
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /**
     * Return only academic data the viewer is permitted to access.
     *
     * @return array{id: int, type: 'lead'|'candidate', name: string, credentials: array{ielts_score: float|null, gpa: float|null, education_level: string|null, desired_course: string|null, desired_country: string|null}}
     */
    private function studentProfile(User $viewer, string $type, int $id): array
    {
        if ($type === 'candidate') {
            abort_unless($viewer->hasPermissionTo('candidate.view'), 403);
            $candidate = Candidate::query()->findOrFail($id);

            return [
                'id' => $candidate->id,
                'type' => 'candidate',
                'name' => $candidate->name,
                'credentials' => [
                    'ielts_score' => $candidate->ielts_score !== null ? (float) $candidate->ielts_score : null,
                    'gpa' => $candidate->gpa !== null ? (float) $candidate->gpa : null,
                    'education_level' => $candidate->education_level,
                    'desired_course' => $candidate->desired_course,
                    'desired_country' => $candidate->desired_country,
                ],
            ];
        }

        abort_unless($type === 'lead', 404);
        abort_unless($viewer->hasPermissionTo('lead.view'), 403);
        $lead = Lead::query()->with('candidate')->findOrFail($id);
        $candidate = $viewer->hasPermissionTo('candidate.view') ? $lead->candidate : null;

        return [
            'id' => $lead->id,
            'type' => 'lead',
            'name' => $lead->name,
            'credentials' => [
                'ielts_score' => $candidate?->ielts_score !== null ? (float) $candidate->ielts_score : null,
                'gpa' => $candidate?->gpa !== null ? (float) $candidate->gpa : null,
                'education_level' => $candidate?->education_level,
                'desired_course' => $candidate?->desired_course ?? $lead->interest_course,
                'desired_country' => $candidate?->desired_country ?? $lead->interest_country,
            ],
        ];
    }
}
