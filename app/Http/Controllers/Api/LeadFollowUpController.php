<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeadFollowUpRequest;
use App\Http\Resources\LeadFollowUpResource;
use App\Models\Lead;
use App\Services\LeadService;
use Illuminate\Support\Facades\Gate;

class LeadFollowUpController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Lead $lead)
    {
        Gate::authorize('view', $lead);

        return LeadFollowUpResource::collection($lead->followUps()->with('createdBy')->latest('follow_up_date')->paginate(20));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreLeadFollowUpRequest $request, Lead $lead, LeadService $leadService)
    {
        Gate::authorize('update', $lead);

        return LeadFollowUpResource::make($leadService->addFollowUp($lead, $request->validated(), $request->user()));
    }

    /**
     * Display the specified resource.
     */
}
