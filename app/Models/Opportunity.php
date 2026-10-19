<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opportunity extends Model
{
    protected $fillable = ['university_id', 'title', 'program', 'level', 'intake', 'deadline', 'tuition_fee', 'currency', 'scholarship', 'requirements', 'eligibility_criteria', 'status'];

    protected function casts(): array
    {
        return ['deadline' => 'date', 'tuition_fee' => 'decimal:2', 'eligibility_criteria' => 'array'];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(CandidateApplication::class);
    }
}
