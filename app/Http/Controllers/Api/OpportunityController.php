<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOpportunityRequest;
use App\Http\Requests\UpdateOpportunityRequest;
use App\Http\Resources\OpportunityDetailResource;
use App\Http\Resources\OpportunityResource;
use App\Models\CandidateApplication;
use App\Models\Opportunity;
use App\Services\OpportunityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OpportunityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Opportunity::class);
        $filters = $request->validate(['search' => ['nullable', 'string'], 'status' => ['nullable', 'string'], 'level' => ['nullable', 'string'], 'university_id' => ['nullable', 'integer', 'exists:universities,id'], 'per_page' => ['nullable', 'integer', 'min:10', 'max:100']]);
        $opportunities = Opportunity::query()->with('university:id,name,country,city,logo_url')->withCount('applications')
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('title', 'like', "%{$search}%")->orWhere('program', 'like', "%{$search}%")))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['level'] ?? null, fn ($query, $level) => $query->where('level', $level))
            ->when($filters['university_id'] ?? null, fn ($query, $id) => $query->where('university_id', $id))
            ->latest()->paginate($filters['per_page'] ?? 20)->withQueryString();

        return OpportunityResource::collection($opportunities)->additional([
            'status_counts' => Opportunity::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'total_applications' => CandidateApplication::query()->count(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreOpportunityRequest $request, OpportunityService $opportunityService): JsonResponse
    {
        $opportunity = $opportunityService->create($request->validated());

        return OpportunityResource::make($opportunity->load('university'))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Opportunity $opportunity): OpportunityDetailResource
    {
        Gate::authorize('view', $opportunity);

        return OpportunityDetailResource::make($opportunity->load(['university', 'applications.candidate']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateOpportunityRequest $request, Opportunity $opportunity, OpportunityService $opportunityService): OpportunityDetailResource
    {
        return OpportunityDetailResource::make($opportunityService->update($opportunity, $request->validated())->load(['university', 'applications.candidate']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Opportunity $opportunity, OpportunityService $opportunityService): JsonResponse
    {
        Gate::authorize('delete', $opportunity);
        $opportunityService->delete($opportunity);

        return response()->json(status: 204);
    }
}
