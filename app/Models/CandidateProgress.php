<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidateProgress extends Model
{
    protected $table = 'candidate_progress';

    /** Decisions recorded on the Visa step. */
    public const VISA_OUTCOMES = ['Approved', 'Refused'];

    protected $fillable = ['candidate_id', 'opportunity_id', 'step', 'status', 'outcome', 'notes', 'completed_at'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }
}
