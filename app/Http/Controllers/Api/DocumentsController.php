<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentsController extends Controller
{
    /**
     * Search candidate document folders and return global verification summaries.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
        ]);

        $groups = [
            'Personal / KYC' => ['Passport', 'Photo', 'Bank Statement'],
            'Academic' => ['Transcript', 'Certificate'],
            'Experience' => ['SOP', 'Recommendation'],
            'Language Test' => ['IELTS'],
        ];
        $documentCounts = CandidateDocument::query()
            ->whereHas('candidate')
            ->select('type')
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as verified', ['Verified'])
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $summary = collect($groups)->map(function (array $types, string $label) use ($documentCounts): array {
            $total = collect($types)->sum(fn (string $type): int => (int) ($documentCounts->get($type)?->total ?? 0));
            $verified = collect($types)->sum(fn (string $type): int => (int) ($documentCounts->get($type)?->verified ?? 0));

            return [
                'label' => $label,
                'total' => $total,
                'verified' => $verified,
                'percent' => $total > 0 ? (int) round(($verified / $total) * 100) : 0,
            ];
        })->values();

        $candidates = Candidate::query()
            ->whereHas('documents')
            ->withCount('documents')
            ->withCount(['documents as verified_documents_count' => fn (Builder $query) => $query->where('status', 'Verified')])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhereHas('documents', fn (Builder $documents) => $documents
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('type', 'like', "%{$search}%"));
                });
            })
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 9)
            ->withQueryString();

        return response()->json([
            'data' => $candidates->getCollection()->map(fn (Candidate $candidate): array => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'phone' => $candidate->phone,
                'documents_count' => (int) $candidate->documents_count,
                'verified_documents_count' => (int) $candidate->verified_documents_count,
            ])->values(),
            'summary' => $summary,
            'meta' => [
                'current_page' => $candidates->currentPage(),
                'from' => $candidates->firstItem(),
                'last_page' => $candidates->lastPage(),
                'per_page' => $candidates->perPage(),
                'to' => $candidates->lastItem(),
                'total' => $candidates->total(),
            ],
        ]);
    }
}
