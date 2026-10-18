<?php

namespace App\Concerns;

use App\Enums\TaskPriority;
use App\Enums\TaskRecurrence;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

trait TaskValidationRules
{
    /**
     * Rules shared by task create and update. On update every field is optional.
     *
     * @return array<string, array<int, ValidationRule|Closure|array<mixed>|string>>
     */
    protected function taskRules(bool $isUpdate = false): array
    {
        $presence = $isUpdate ? 'sometimes' : 'required';

        return [
            'title' => [$presence, 'string', 'min:2', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::enum(TaskStatus::class)],
            'priority' => [$presence, Rule::enum(TaskPriority::class)],
            'due_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before:2100-01-01'],
            'due_time' => ['sometimes', 'nullable', 'date_format:H:i', $this->requiresDueDateRule()],
            'recurrence' => ['sometimes', 'nullable', Rule::enum(TaskRecurrence::class), $this->requiresDueDateRule()],
            'recurrence_until' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:due_date'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', $this->assignableUserRule()],
            'lead_id' => ['sometimes', 'nullable', 'integer', 'exists:leads,id', 'prohibits:candidate_id'],
            'candidate_id' => ['sometimes', 'nullable', 'integer', 'exists:candidates,id'],
            'checklist' => ['sometimes', 'array', 'max:50'],
            'checklist.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Linking a task to a student requires permission to view that student.
     */
    protected function canLinkStudent(Request $request, User $user): bool
    {
        if ($request->filled('lead_id') && ! $user->can('lead.view')) {
            return false;
        }

        return ! ($request->filled('candidate_id') && ! $user->can('candidate.view'));
    }

    /**
     * A due time or recurrence needs a due date: the one being sent, or on update the task's current one.
     */
    private function requiresDueDateRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if ($value === null) {
                return;
            }

            $task = $this->route('task');
            $hasDueDate = $this->exists('due_date') ? $this->filled('due_date') : ($task instanceof Task && $task->due_date !== null);

            if (! $hasDueDate) {
                $fail('Set a due date first.');
            }
        };
    }

    /**
     * Tasks may only be assigned to active users who can see tasks.
     */
    private function assignableUserRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $assignee = User::query()->where('is_active', true)->whereKey($value)->first();

            if ($assignee === null || ! $assignee->can('task.view')) {
                $fail('Choose an active team member who can see tasks.');
            }
        };
    }
}
