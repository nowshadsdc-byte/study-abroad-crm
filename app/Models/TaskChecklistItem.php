<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\TaskChecklistItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $task_id
 * @property string $body
 * @property bool $is_completed
 * @property CarbonImmutable|null $completed_at
 * @property int|null $completed_by_id
 * @property int $position
 */
class TaskChecklistItem extends Model
{
    /** @use HasFactory<TaskChecklistItemFactory> */
    use HasFactory;

    protected $fillable = ['task_id', 'body', 'is_completed', 'completed_at', 'completed_by_id', 'position'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_completed' => 'boolean', 'completed_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_id');
    }
}
