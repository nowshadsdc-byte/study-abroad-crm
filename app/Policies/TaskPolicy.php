<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskNote;
use App\Models\User;

/**
 * Ownership (creator or assignee) is checked first, then the supervisor
 * permissions. task.edit_any never grants delete; only task.delete_any does.
 * Administrators bypass every check via Gate::before.
 */
class TaskPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('task.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        return $user->hasPermissionTo('task.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('task.view') && $user->hasPermissionTo('task.create');
    }

    /**
     * Details, dates, status, assignee, student link and checklist.
     */
    public function update(User $user, Task $task): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }

        return $task->isParticipant($user) || $user->hasPermissionTo('task.edit_any');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }

        return $task->isParticipant($user) || $user->hasPermissionTo('task.delete_any');
    }

    /**
     * Anyone who can see the task may add a note to it.
     */
    public function addNote(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }

    /**
     * Notes are edited or removed by their author, or by a supervisor.
     */
    public function manageNote(User $user, Task $task, TaskNote $note): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }

        return $note->user_id === $user->id || $user->hasPermissionTo('task.edit_any');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Task $task): bool
    {
        return $this->delete($user, $task);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Task $task): bool
    {
        return $user->hasRole('Administrator');
    }
}
