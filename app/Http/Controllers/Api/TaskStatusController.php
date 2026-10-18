<?php

namespace App\Http\Controllers\Api;

use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTaskStatusRequest;
use App\Http\Resources\TaskDetailResource;
use App\Models\Task;
use App\Services\TaskService;

class TaskStatusController extends Controller
{
    /**
     * Change a task's status. Completing a recurring task schedules its next occurrence.
     */
    public function update(UpdateTaskStatusRequest $request, Task $task, TaskService $taskService): TaskDetailResource
    {
        $task = $taskService->changeStatus($task, TaskStatus::from($request->validated('status')), $request->user());

        return TaskDetailResource::make(TaskController::loadDetail($task));
    }
}
