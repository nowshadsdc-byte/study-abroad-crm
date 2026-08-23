<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignCandidateRequest;
use App\Http\Requests\StoreCandidateRequest;
use App\Http\Requests\UpdateCandidateRequest;
use App\Http\Resources\CandidateDetailResource;
use App\Http\Resources\CandidateResource;
use App\Models\Candidate;
use App\Models\User;
use App\Services\CandidateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CandidateController extends Controller
{
    /**
     * List active users who can be assigned to a candidate.
     */
    public function assignableUsers(): JsonResponse
    {
        return response()->json([
            'data' => User::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Candidate::class);
        $filters = $request->validate(['search' => ['nullable', 'string'], 'status' => ['nullable', 'in:Active,On Hold,Completed,Withdrawn'], 'current_step' => ['nullable', 'in:Application,Documents,Submission,Offer,Visa,Enrollment'], 'assigned_to_id' => ['nullable', 'exists:users,id'], 'per_page' => ['nullable', 'integer', 'min:10', 'max:100']]);
        $candidates = Candidate::query()->with('assignedTo:id,name,avatar')->withCount('invoices')->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))->when($filters['current_step'] ?? null, fn ($query, $step) => $query->where('current_step', $step))->when($filters['assigned_to_id'] ?? null, fn ($query, $id) => $query->where('assigned_to_id', $id))->latest()->paginate($filters['per_page'] ?? 20)->withQueryString();

        return CandidateResource::collection($candidates)->additional(['status_counts' => Candidate::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status')]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCandidateRequest $request, CandidateService $candidateService): JsonResponse
    {
        $candidate = $candidateService->createCandidateWithProgress($request->validated(), $request->user());

        return CandidateResource::make($candidate->load('assignedTo'))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Candidate $candidate): CandidateDetailResource
    {
        Gate::authorize('view', $candidate);

        return CandidateDetailResource::make($candidate->load(['lead', 'assignedTo', 'documents', 'progressRecords.opportunity.university', 'applications.opportunity.university', 'invoices']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCandidateRequest $request, Candidate $candidate, CandidateService $candidateService): CandidateDetailResource
    {
        return CandidateDetailResource::make($candidateService->updateCandidate($candidate, $request->validated(), $request->user())->fresh(['lead', 'assignedTo', 'documents', 'progressRecords.opportunity.university', 'applications.opportunity.university', 'invoices']));
    }

    /**
     * Update the assigned counselor for the specified resource.
     */
    public function assign(AssignCandidateRequest $request, Candidate $candidate, CandidateService $candidateService): CandidateDetailResource
    {
        return CandidateDetailResource::make($candidateService->updateCandidate($candidate, $request->validated(), $request->user())->fresh(['lead', 'assignedTo', 'documents', 'progressRecords.opportunity.university', 'applications.opportunity.university', 'invoices']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Candidate $candidate, CandidateService $candidateService): JsonResponse
    {
        Gate::authorize('delete', $candidate);
        $candidateService->archiveCandidate($candidate, $request->user());

        return response()->json(status: 204);
    }
}
