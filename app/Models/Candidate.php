<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidate extends Model
{
    use SoftDeletes;

    public const WORKFLOW_STEPS = ['Application', 'Documents', 'Submission', 'Offer', 'Visa', 'Enrollment'];

    protected $fillable = ['lead_id', 'name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'education_level', 'institution', 'gpa', 'passing_year', 'ielts_score', 'desired_country', 'desired_course', 'desired_intake', 'current_step', 'status', 'notes', 'assigned_to_id'];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'gpa' => 'decimal:2', 'ielts_score' => 'decimal:1'];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(CandidateProgress::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CandidateDocument::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(CandidateApplication::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'entity_id')->where('type', 'Candidate');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
