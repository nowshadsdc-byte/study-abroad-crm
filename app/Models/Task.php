<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use Carbon\CarbonImmutable;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property TaskStatus $status
 * @property TaskPriority $priority
 * @property CarbonImmutable|null $due_date
 * @property string|null $due_time
 * @property TaskRecurrence|null $recurrence
 * @property CarbonImmutable|null $recurrence_until
 * @property int|null $recurred_from_id
 * @property int|null $created_by_id
 * @property int|null $assigned_to_id
 * @property int|null $lead_id
 * @property int|null $candidate_id
 * @property CarbonImmutable|null $completed_at
 * @property int|null $completed_by_id
 */
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'description', 'status', 'priority', 'due_date', 'due_time', 'recurrence', 'recurrence_until',
        'recurred_from_id', 'created_by_id', 'assigned_to_id', 'lead_id', 'candidate_id', 'completed_at', 'completed_by_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'priority' => TaskPriority::class,
            'recurrence' => TaskRecurrence::class,
            'due_date' => 'date:Y-m-d',
            'recurrence_until' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Today's date in the business timezone (Asia/Dhaka by default), as Y-m-d.
     */
    public static function businessToday(): string
    {
        return CarbonImmutable::now(config('app.business_timezone'))->toDateString();
    }

    /**
     * Where the task sits relative to today in the business timezone.
     *
     * @return 'completed'|'cancelled'|'overdue'|'today'|'upcoming'|'none'
     */
    public function dueState(?string $today = null): string
    {
        if ($this->status === TaskStatus::Completed) {
            return 'completed';
        }

        if ($this->status === TaskStatus::Cancelled) {
            return 'cancelled';
        }

        if ($this->due_date === null) {
            return 'none';
        }

        $dueDate = $this->due_date->toDateString();
        $today ??= self::businessToday();

        return match (true) {
            $dueDate < $today => 'overdue',
            $dueDate === $today => 'today',
            default => 'upcoming',
        };
    }

    public function isParticipant(User $user): bool
    {
        return $this->created_by_id === $user->id || $this->assigned_to_id === $user->id;
    }

    /**
     * @param  Builder<Task>  $query
     */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', TaskStatus::openValues());
    }

    /**
     * Tasks assigned to the user, or created by them and not assigned to anyone else.
     *
     * @param  Builder<Task>  $query
     */
    public function scopeInvolving(Builder $query, User $user): void
    {
        $query->where(fn (Builder $query) => $query
            ->where('assigned_to_id', $user->id)
            ->orWhere(fn (Builder $query) => $query->where('created_by_id', $user->id)->whereNull('assigned_to_id')));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_id');
    }

    /**
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Candidate, $this>
     */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function recurredFrom(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'recurred_from_id');
    }

    /**
     * @return HasOne<Task, $this>
     */
    public function nextOccurrence(): HasOne
    {
        return $this->hasOne(Task::class, 'recurred_from_id')->withTrashed();
    }

    /**
     * @return HasMany<TaskChecklistItem, $this>
     */
    public function checklistItems(): HasMany
    {
        return $this->hasMany(TaskChecklistItem::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasMany<TaskNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(TaskNote::class);
    }
}
