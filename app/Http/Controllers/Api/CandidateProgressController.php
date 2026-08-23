<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCandidateProgressRequest;
use App\Http\Resources\CandidateDetailResource;
use App\Models\Candidate;
use App\Models\CandidateProgress;
use App\Services\CandidateService;

class CandidateProgressController extends Controller
{
    public function update(UpdateCandidateProgressRequest $request, Candidate $candidate, CandidateProgress $progress, CandidateService $candidateService): CandidateDetailResource
    {
        abort_unless($progress->candidate_id === $candidate->id, 404);

        return CandidateDetailResource::make($candidateService->updateProgressAndCurrentStep($candidate, $progress, $request->validated(), $request->user()));
    }
}
