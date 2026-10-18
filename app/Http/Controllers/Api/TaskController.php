<?php

namespace App\Http\Controllers\Api;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskDetailResource;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use App\Services\TaskService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public const VIEWS = ['my_day', 'assigned', 'created', 'upcoming', 'completed', 'all'];

    /**
     * Active users who can see tasks, i.e. who may be assigned one.
     */
    public function assignableUsers(): JsonResponse
    {
        Gate::authorize('create', Task::class);

        return response()->json([
            'data' => User::permission('task.view')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'avatar']),
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Task::class);

        $filters = $request->validate([
            'view' => ['nullable', Rule::in(self::VIEWS)],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'array'],
            'status.*' => [Rule::enum(TaskStatus::class)],
            'priority' => ['nullable', Rule::enum(TaskPriority::class)],
            'due_from' => ['nullable', 'date_format:Y-m-d'],
            'due_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:due_from'],
            'assigned_to_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $user = $request->user();
        $today = Task::businessToday();
        $tomorrow = CarbonImmutable::parse($today)->addDay()->toDateString();
        $view = $filters['view'] ?? 'my_day';
        $statuses = $filters['status'] ?? null;

        $tasks = Task::query()
            ->with(['creator:id,name', 'assignee:id,name,avatar', 'lead:id,name', 'candidate:id,name'])
            ->withCount(['checklistItems', 'checklistItems as completed_checklist_items_count' => fn (Builder $query) => $query->where('is_completed', true), 'notes'])
            ->tap(fn (Builder $query) => $this->applyView($query, $view, $user, $today, $tomorrow, $statuses))
            ->when($statuses, fn (Builder $query, array $statuses) => $query->whereIn('status', $statuses))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('title', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%")))
            ->when($filters['priority'] ?? null, fn (Builder $query, string $priority) => $query->where('priority', $priority))
            ->when($filters['due_from'] ?? null, fn (Builder $query, string $from) => $query->where('due_date', '>=', $from))
            ->when($filters['due_to'] ?? null, fn (Builder $query, string $to) => $query->where('due_date', '<', CarbonImmutable::parse($to)->addDay()->toDateString()))
            ->when($filters['assigned_to_id'] ?? null, fn (Builder $query, int|string $id) => $query->where('assigned_to_id', (int) $id))
            ->tap(fn (Builder $query) => $view === 'completed'
                ? $query->latest('completed_at')
                : $query->orderByRaw('due_date is null')->orderBy('due_date')->orderByRaw('due_time is null')->orderBy('due_time')->orderByDesc('id'))
            ->paginate($filters['per_page'] ?? 50)
            ->withQueryString();

        return TaskResource::collection($tasks)->additional([
            'counts' => $this->viewCounts($user, $today, $tomorrow),
            'today' => $today,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskRequest $request, TaskService $taskService): JsonResponse
    {
        $task = $taskService->create($request->validated(), $request->user());

        return TaskDetailResource::make($this->loadDetail($task))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Task $task): TaskDetailResource
    {
        Gate::authorize('view', $task);

        return TaskDetailResource::make($this->loadDetail($task));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateTaskRequest $request, Task $task, TaskService $taskService): TaskDetailResource
    {
        return TaskDetailResource::make($this->loadDetail($taskService->update($task, $request->validated(), $request->user())));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task, TaskService $taskService): JsonResponse
    {
        Gate::authorize('delete', $task);
        $taskService->archive($task, $request->user());

        return response()->json(status: 204);
    }

    /**
     * Load everything the task drawer needs.
     */
    public static function loadDetail(Task $task): Task
    {
        $task->load([
            'creator:id,name', 'assignee:id,name,avatar', 'completedBy:id,name', 'lead:id,name', 'candidate:id,name',
            'checklistItems.completedBy:id,name', 'notes' => fn ($query) => $query->with('user:id,name,avatar')->latest()->latest('id'), 'nextOccurrence:id,recurred_from_id',
        ]);
        $task->notes->each->setRelation('task', $task);

        return $task;
    }

    /**
     * @param  Builder<Task>  $query
     * @param  array<int, string>|null  $statuses
     */
    private function applyView(Builder $query, string $view, User $user, string $today, string $tomorrow, ?array $statuses): void
    {
        match ($view) {
            'my_day' => $query->involving($user)->open()->whereNotNull('due_date')->where('due_date', '<', $tomorrow),
            'assigned' => $query->where('assigned_to_id', $user->id)->when(! $statuses, fn (Builder $query) => $query->open()),
            'created' => $query->where('created_by_id', $user->id),
            'upcoming' => $query->involving($user)->open()->where('due_date', '>=', $tomorrow),
            'completed' => $query->involving($user)->where('status', TaskStatus::Completed),
            default => $query,
        };
    }

    /**
     * Per-view counts for the tabs, in a single query.
     *
     * @return array<string, int>
     */
    private function viewCounts(User $user, string $today, string $tomorrow): array
    {
        $open = TaskStatus::openValues();
        $openPlaceholders = implode(', ', array_fill(0, count($open), '?'));
        $involving = '(assigned_to_id = ? or (created_by_id = ? and assigned_to_id is null))';
        $involvingBindings = [$user->id, $user->id];

        $row = Task::query()->toBase()->selectRaw(implode(', ', [
            "sum(case when {$involving} and status in ({$openPlaceholders}) and due_date is not null and due_date < ? then 1 else 0 end) as my_day",
            "sum(case when {$involving} and status in ({$openPlaceholders}) and due_date is not null and due_date < ? then 1 else 0 end) as overdue",
            "sum(case when assigned_to_id = ? and status in ({$openPlaceholders}) then 1 else 0 end) as assigned",
            'sum(case when created_by_id = ? then 1 else 0 end) as created',
            "sum(case when {$involving} and status in ({$openPlaceholders}) and due_date >= ? then 1 else 0 end) as upcoming",
            "sum(case when {$involving} and status = ? then 1 else 0 end) as completed",
            'count(*) as all_tasks',
        ]), [
            ...$involvingBindings, ...$open, $tomorrow,
            ...$involvingBindings, ...$open, $today,
            $user->id, ...$open,
            $user->id,
            ...$involvingBindings, ...$open, $tomorrow,
            ...$involvingBindings, TaskStatus::Completed->value,
        ])->whereNull('deleted_at')->first();

        return [
            'my_day' => (int) $row->my_day,
            'overdue' => (int) $row->overdue,
            'assigned' => (int) $row->assigned,
            'created' => (int) $row->created,
            'upcoming' => (int) $row->upcoming,
            'completed' => (int) $row->completed,
            'all' => (int) $row->all_tasks,
        ];
    }
}
