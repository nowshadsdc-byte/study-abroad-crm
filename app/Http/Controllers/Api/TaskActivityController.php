<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class TaskActivityController extends Controller
{
    /**
     * The task's change history, newest first.
     */
    public function index(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $activities = Activity::query()
            ->with('user:id,name')
            ->where('type', 'Task')
            ->where('entity_id', $task->id)
            ->latest()
            ->latest('id')
            ->paginate(20)
            ->through(fn (Activity $activity): array => [
                'id' => $activity->id,
                'action' => $activity->action,
                'description' => $activity->description,
                'meta' => $activity->meta,
                'user' => $activity->user ? ['id' => $activity->user->id, 'name' => $activity->user->name] : null,
                'created_at' => $activity->created_at,
            ]);

        return response()->json($activities);
    }
}
