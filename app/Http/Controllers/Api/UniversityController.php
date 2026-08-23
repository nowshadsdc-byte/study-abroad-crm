<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUniversityRequest;
use App\Http\Requests\UpdateUniversityRequest;
use App\Http\Resources\UniversityDetailResource;
use App\Http\Resources\UniversityResource;
use App\Models\University;
use App\Services\UniversityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class UniversityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', University::class);
        $filters = $request->validate(['search' => ['nullable', 'string'], 'country' => ['nullable', 'string'], 'is_active' => ['nullable', 'boolean'], 'per_page' => ['nullable', 'integer', 'min:10', 'max:100']]);
        $universities = University::query()->withCount('opportunities')
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('city', 'like', "%{$search}%")))
            ->when($filters['country'] ?? null, fn ($query, $country) => $query->where('country', $country))
            ->when(array_key_exists('is_active', $filters) && $filters['is_active'] !== null, fn ($query) => $query->where('is_active', $filters['is_active']))
            ->orderBy('name')->paginate($filters['per_page'] ?? 20)->withQueryString();

        return UniversityResource::collection($universities)->additional([
            'countries' => University::query()->whereNotNull('country')->distinct()->orderBy('country')->pluck('country'),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUniversityRequest $request, UniversityService $universityService): JsonResponse
    {
        $university = $universityService->create($request->validated());

        return UniversityResource::make($university)->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(University $university): UniversityDetailResource
    {
        Gate::authorize('view', $university);

        return UniversityDetailResource::make($university->load(['opportunities' => fn ($query) => $query->withCount('applications')])->loadCount('opportunities'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUniversityRequest $request, University $university, UniversityService $universityService): UniversityDetailResource
    {
        $university = $universityService->update($university, $request->validated());

        return UniversityDetailResource::make($university->load(['opportunities' => fn ($query) => $query->withCount('applications')])->loadCount('opportunities'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(University $university, UniversityService $universityService): JsonResponse
    {
        Gate::authorize('delete', $university);
        $universityService->delete($university);

        return response()->json(status: 204);
    }
}
