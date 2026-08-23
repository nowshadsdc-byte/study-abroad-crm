<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadFollowUp extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['lead_id', 'type', 'notes', 'outcome', 'follow_up_date', 'next_follow_up_date', 'created_by_id'];

    protected function casts(): array
    {
        return ['follow_up_date' => 'datetime', 'next_follow_up_date' => 'datetime'];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
