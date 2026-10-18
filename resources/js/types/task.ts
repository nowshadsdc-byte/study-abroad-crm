export const TASK_STATUSES = [
    'Pending',
    'In Progress',
    'On Hold',
    'Completed',
    'Cancelled',
] as const;

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const TASK_RECURRENCES = ['daily', 'weekly', 'monthly'] as const;

export const TASK_VIEWS = [
    'my_day',
    'assigned',
    'created',
    'upcoming',
    'completed',
    'all',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];
export type TaskView = (typeof TASK_VIEWS)[number];
export type TaskDueState =
    'overdue' | 'today' | 'upcoming' | 'none' | 'completed' | 'cancelled';

export type TaskPerson = { id: number; name: string; avatar?: string | null };

export type TaskStudent = {
    type: 'lead' | 'client';
    id: number;
    name: string;
};

export type Task = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    due_time: string | null;
    due_state: TaskDueState;
    recurrence: TaskRecurrence | null;
    recurrence_until: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    creator: TaskPerson | null;
    assignee: TaskPerson | null;
    student: TaskStudent | null;
    checklist: { total: number; completed: number };
    notes_count?: number;
    can: { update: boolean; delete: boolean };
};

export type TaskChecklistItem = {
    id: number;
    body: string;
    is_completed: boolean;
    completed_at: string | null;
    completed_by: TaskPerson | null;
    position: number;
};

export type TaskNote = {
    id: number;
    body: string;
    user: TaskPerson | null;
    created_at: string;
    updated_at: string;
    is_edited: boolean;
    can: { manage: boolean };
};

export type TaskDetail = Task & {
    lead_id: number | null;
    candidate_id: number | null;
    assigned_to_id: number | null;
    recurred_from_id: number | null;
    next_occurrence_id: number | null;
    completed_by: TaskPerson | null;
    checklist_items: TaskChecklistItem[];
    notes: TaskNote[];
};

export type TaskActivity = {
    id: number;
    action: string;
    description: string;
    meta: Record<string, unknown> | null;
    user: TaskPerson | null;
    created_at: string;
};

export type TaskCounts = Record<TaskView, number> & { overdue: number };

export type TaskFilters = {
    view: TaskView;
    search: string;
    status: TaskStatus[];
    priority: TaskPriority | '';
    due_from: string;
    due_to: string;
    assigned_to_id: string;
    page: number;
};

export type TasksResponse = {
    data: Task[];
    counts: TaskCounts;
    today: string;
    meta: { current_page: number; last_page: number; total: number };
};
