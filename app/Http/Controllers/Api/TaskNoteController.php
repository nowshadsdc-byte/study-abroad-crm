<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskNoteRequest;
use App\Http\Resources\TaskNoteResource;
use App\Models\Task;
use App\Models\TaskNote;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskNoteController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskNoteRequest $request, Task $task, TaskService $taskService): JsonResponse
    {
        $note = $taskService->addNote($task, $request->validated('body'), $request->user());
        $note->setRelation('task', $task);

        return TaskNoteResource::make($note)->response()->setStatusCode(201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreTaskNoteRequest $request, Task $task, TaskNote $note, TaskService $taskService): TaskNoteResource
    {
        abort_unless($note->task_id === $task->id, 404);
        $note->setRelation('task', $task);

        return TaskNoteResource::make($taskService->updateNote($note, $request->validated('body'), $request->user()));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task, TaskNote $note, TaskService $taskService): JsonResponse
    {
        abort_unless($note->task_id === $task->id, 404);
        Gate::authorize('manageNote', [$task, $note]);
        $note->setRelation('task', $task);
        $taskService->deleteNote($note, $request->user());

        return response()->json(status: 204);
    }
}
