<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use App\Http\Resources\LeadDetailResource;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Models\User;
use App\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LeadController extends Controller
{
    /**
     * List active users who can be assigned to a lead.
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
        Gate::authorize('viewAny', Lead::class);
        $filters = $request->validate(['search' => ['nullable', 'string'], 'status' => ['nullable', 'string'], 'source' => ['nullable', 'string'], 'interest_country' => ['nullable', 'string', 'max:255'], 'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'], 'needs_follow_up' => ['nullable', 'boolean'], 'per_page' => ['nullable', 'integer', 'min:10', 'max:100']]);
        $leads = Lead::query()->with(['assignedTo:id,name,avatar', 'candidate:id,lead_id'])
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%")))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['source'] ?? null, fn ($query, $source) => $query->where('source', $source))
            ->when($filters['interest_country'] ?? null, fn ($query, $country) => $query->where('interest_country', $country))
            ->when($filters['assigned_to_id'] ?? null, fn ($query, $id) => $query->where('assigned_to_id', $id))
            ->when($filters['needs_follow_up'] ?? null, fn ($query) => $query->whereNotIn('status', ['Converted', 'Lost'])->whereHas('followUps', fn ($query) => $query->whereDate('next_follow_up_date', '<=', today())))
            ->latest()->paginate($filters['per_page'] ?? 20)->withQueryString();

        $now = now();
        $startOfWeek = $now->copy()->startOfWeek();
        $endOfWeek = $now->copy()->endOfWeek();
        $startOfLastWeek = $now->copy()->subWeek()->startOfWeek();
        $endOfLastWeek = $now->copy()->subWeek()->endOfWeek();

        $newThisWeek = Lead::query()->whereBetween('created_at', [$startOfWeek, $endOfWeek])->count();
        $newLastWeek = Lead::query()->whereBetween('created_at', [$startOfLastWeek, $endOfLastWeek])->count();
        $newPercentChange = $newLastWeek > 0 ? round((($newThisWeek - $newLastWeek) / $newLastWeek) * 100) : 100;
        $newPercentChangeText = $newPercentChange > 0 ? "+{$newPercentChange}%" : "{$newPercentChange}%";

        $followUpsDueTotal = LeadFollowUp::query()->whereDate('next_follow_up_date', '<=', today())->count();
        $followUpsDueToday = LeadFollowUp::query()->whereDate('next_follow_up_date', today())->count();

        $totalLeads = Lead::query()->count();
        $qualifiedLeads = Lead::query()->whereIn('status', ['Qualified', 'Converted'])->count();
        $qualifiedPercentage = $totalLeads > 0 ? round(($qualifiedLeads / $totalLeads) * 100) : 0;

        $inPipeline = Lead::query()->whereNotIn('status', ['Lost', 'Converted'])->count();
        $sourcesCount = Lead::query()->whereNotIn('status', ['Lost', 'Converted'])->distinct('source')->count('source');

        $metrics = [
            'newThisWeek' => [
                'value' => (string) $newThisWeek,
                'detail' => $newPercentChangeText.' from last week',
            ],
            'followUps' => [
                'value' => (string) $followUpsDueTotal,
                'detail' => $followUpsDueToday.' due today',
            ],
            'qualified' => [
                'value' => $qualifiedPercentage.'%',
                'detail' => 'Target: 65%',
            ],
            'pipeline' => [
                'value' => (string) $inPipeline,
                'detail' => 'Across '.$sourcesCount.' sources',
            ],
        ];

        return LeadResource::collection($leads)->additional([
            'metrics' => $metrics,
            'status_counts' => Lead::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'filter_options' => [
                'sources' => Lead::query()->whereNotNull('source')->distinct()->orderBy('source')->pluck('source')->values(),
                'countries' => Lead::query()->whereNotNull('interest_country')->distinct()->orderBy('interest_country')->pluck('interest_country')->values(),
                'counselors' => User::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreLeadRequest $request, LeadService $leadService): JsonResponse
    {

        $lead = $leadService->create($request->validated(), $request->user());

        return LeadResource::make($lead->load(['assignedTo', 'candidate']))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Lead $lead): LeadDetailResource
    {
        Gate::authorize('view', $lead);

        return LeadDetailResource::make($lead->load(['assignedTo', 'candidate', 'followUps' => fn ($query) => $query->with('createdBy')->latest('follow_up_date')])->loadCount('followUps'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateLeadRequest $request, Lead $lead, LeadService $leadService): LeadDetailResource
    {
        return LeadDetailResource::make($leadService->update($lead, $request->validated(), $request->user())->load(['followUps' => fn ($query) => $query->with('createdBy')->latest('follow_up_date')])->loadCount('followUps'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Lead $lead, LeadService $leadService): JsonResponse
    {
        Gate::authorize('delete', $lead);
        $leadService->archive($lead, $request->user());

        return response()->json(status: 204);
    }

    public function convert(Request $request, Lead $lead, LeadService $leadService): LeadDetailResource
    {
        Gate::authorize('convert', $lead);
        $leadService->convert($lead, $request->user());

        return LeadDetailResource::make($lead->fresh()->load(['assignedTo', 'candidate', 'followUps' => fn ($query) => $query->with('createdBy')->latest('follow_up_date')])->loadCount('followUps'));
    }
}
