<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidateApplication extends Model
{
    protected $fillable = ['candidate_id', 'opportunity_id', 'status', 'notes', 'applied_at'];

    protected function casts(): array
    {
        return ['applied_at' => 'datetime'];
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
