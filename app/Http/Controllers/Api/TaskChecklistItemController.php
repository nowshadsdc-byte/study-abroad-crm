<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskChecklistItemRequest;
use App\Http\Requests\UpdateTaskChecklistItemRequest;
use App\Http\Resources\TaskChecklistItemResource;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskChecklistItemController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskChecklistItemRequest $request, Task $task, TaskService $taskService): JsonResponse
    {
        $item = $taskService->addChecklistItem($task, $request->validated('body'), $request->user());

        return TaskChecklistItemResource::make($item)->response()->setStatusCode(201);
    }

    /**
     * Edit the text of an item or mark it (in)complete.
     */
    public function update(UpdateTaskChecklistItemRequest $request, Task $task, TaskChecklistItem $item, TaskService $taskService): TaskChecklistItemResource
    {
        abort_unless($item->task_id === $task->id, 404);
        $item->setRelation('task', $task);

        return TaskChecklistItemResource::make($taskService->updateChecklistItem($item, $request->validated(), $request->user())->load('completedBy:id,name'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task, TaskChecklistItem $item, TaskService $taskService): JsonResponse
    {
        abort_unless($item->task_id === $task->id, 404);
        Gate::authorize('update', $task);
        $item->setRelation('task', $task);
        $taskService->deleteChecklistItem($item, $request->user());

        return response()->json(status: 204);
    }
}
