<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Models\Opportunity;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?User $user = null): array
    {
        $user ??= auth()->user();
        $today = CarbonImmutable::now('Asia/Dhaka');
        $dayStart = $today->startOfDay();
        $dayEnd = $today->endOfDay();

        $newLeadsCurrent = Lead::query()->whereBetween('created_at', [$today->copy()->subDays(29)->startOfDay(), $dayEnd])->count();
        $newLeadsPrevious = Lead::query()->whereBetween('created_at', [$today->copy()->subDays(59)->startOfDay(), $today->copy()->subDays(30)->endOfDay()])->count();
        $spark = $this->dailyCountsForLastDays(Lead::query()->whereBetween('created_at', [$today->copy()->subDays(29)->startOfDay(), $dayEnd]), 'created_at', 30);

        $followupsDueToday = LeadFollowUp::query()->whereBetween('next_follow_up_date', [$dayStart, $dayEnd])->count();
        $followupsMine = $user ? LeadFollowUp::query()->whereBetween('next_follow_up_date', [$dayStart, $dayEnd])->where('created_by_id', $user->id)->count() : 0;
        $followupsOverdue = LeadFollowUp::query()->where('next_follow_up_date', '<', $dayStart)->count();

        $conversionsCurrent = Lead::query()->where('status', 'Converted')->whereBetween('updated_at', [$today->copy()->subDays(29)->startOfDay(), $dayEnd])->count();
        $conversionSpark = $this->dailyCountsForLastDays(Lead::query()->where('status', 'Converted')->whereBetween('updated_at', [$today->copy()->subDays(29)->startOfDay(), $dayEnd]), 'updated_at', 30);

        $activeApplications = Candidate::query()->whereNotIn('status', ['Visa Approved', 'Rejected', 'Withdrawn'])->count();
        $offers = Candidate::query()->whereIn('status', ['Offer', 'Conditional Offer', 'Unconditional Offer'])->count();

        $approved = Candidate::query()->where('status', 'Visa Approved')->count();
        $refused = Candidate::query()->where('status', 'Rejected')->count();
        $grantRate = $approved + $refused === 0 ? 0 : (int) round(($approved / ($approved + $refused)) * 100);

        $collectionsBdt = (float) InvoicePayment::query()->sum('amount');
        if ($collectionsBdt <= 0) {
            $collectionsBdt = (float) Invoice::query()->sum('amount_paid');
        }
        $outstandingBdt = (float) Invoice::query()->get()->sum(fn (Invoice $invoice) => max(0, (float) $invoice->total - (float) $invoice->amount_paid));

        return [
            'greeting_name' => $this->firstName($user?->name ?? 'User'),
            'today' => [
                'followups_due' => $followupsDueToday,
                'followups_mine' => $followupsMine,
                'overdue' => $followupsOverdue,
            ],
            'kpis' => [
                'new_leads' => [
                    'value' => $newLeadsCurrent,
                    'trend_pct' => $this->percentChange($newLeadsCurrent, $newLeadsPrevious),
                    'spark' => $spark,
                ],
                'followups_today' => [
                    'value' => $followupsDueToday,
                    'mine' => $followupsMine,
                ],
                'conversions' => [
                    'value' => $conversionsCurrent,
                    'spark' => $conversionSpark,
                ],
                'active_applications' => $activeApplications,
                'offers' => $offers,
                'visas_approved' => [
                    'value' => $approved,
                    'grant_rate' => $grantRate,
                ],
                'collections_bdt' => (int) round($collectionsBdt),
                'outstanding_bdt' => (int) round($outstandingBdt),
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function tasks(?User $user = null, string $scope = 'today'): array
    {
        $user ??= auth()->user();
        $today = CarbonImmutable::now('Asia/Dhaka');

        $query = Task::query()
            ->with(['assignee:id,name,avatar', 'lead:id,name', 'candidate:id,name'])
            ->where('status', '!=', 'Completed')
            ->when($scope === 'today', fn ($query) => $query->whereDate('due_date', $today->toDateString()))
            ->when($scope === 'overdue', fn ($query) => $query->whereDate('due_date', '<', $today->toDateString()))
            ->when($scope === 'future', fn ($query) => $query->whereDate('due_date', '>', $today->toDateString()));

        if ($user !== null && $user->can('task.view')) {
            $query->where(function ($subQuery) use ($user) {
                $subQuery->where('assigned_to_id', $user->id)
                    ->orWhere(function ($nested) use ($user) {
                        $nested->where('created_by_id', $user->id)
                            ->whereNull('assigned_to_id');
                    });
            });
        }

        return $query->orderByRaw('due_date is null')->orderBy('due_date')->orderByRaw('due_time is null')->orderBy('due_time')->limit(8)->get()->map(function (Task $task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'priority' => $task->priority?->value ?? 'Medium',
                'type' => $task->lead_id !== null ? 'Follow-up' : 'Task',
                'student_name' => $task->lead?->name ?? $task->candidate?->name ?? null,
                'due_at' => $task->due_date ? $task->due_date->toDateTimeString() : null,
                'steps_done' => $task->checklistItems()->where('is_completed', true)->count(),
                'steps_total' => $task->checklistItems()->count(),
                'status' => $task->status->value,
            ];
        })->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function deadlines(?User $user = null, int $days = 14): array
    {
        $user ??= auth()->user();
        $today = CarbonImmutable::now('Asia/Dhaka');
        $start = $today->startOfDay();
        $end = $today->copy()->addDays($days)->endOfDay();

        $items = Opportunity::query()
            ->with('university:id,name')
            ->whereBetween('deadline', [$start->toDateString(), $end->toDateString()])
            ->orderBy('deadline')
            ->limit(8)
            ->get()
            ->map(function (Opportunity $opportunity) use ($today) {
                $date = CarbonImmutable::parse($opportunity->deadline->toDateString());

                return [
                    'application_id' => $opportunity->id,
                    'student_name' => $opportunity->title,
                    'institution' => $opportunity->university?->name ?? 'Institution',
                    'type' => 'Offer deadline',
                    'due_date' => $date->toDateString(),
                    'days_left' => (int) $date->diffInDays($today, false),
                ];
            });

        return $items->all();
    }

    private function dailyCountsForLastDays($query, string $column, int $days): array
    {
        $start = CarbonImmutable::now('Asia/Dhaka')->subDays($days - 1)->startOfDay();
        $dateFormat = 'Y-m-d';

        $rows = $query->selectRaw('DATE('.$column.') as bucket, COUNT(*) as total')
            ->where($column, '>=', $start->toDateTimeString())
            ->groupByRaw('DATE('.$column.')')
            ->pluck('total', 'bucket')
            ->all();

        $values = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = CarbonImmutable::now('Asia/Dhaka')->subDays($i)->toDateString();
            $values[] = (int) ($rows[$date] ?? 0);
        }

        return $values;
    }

    private function percentChange(int $current, int $previous): int
    {
        if ($previous === 0) {
            return $current > 0 ? 100 : 0;
        }

        return (int) round((($current - $previous) / $previous) * 100);
    }

    private function firstName(?string $name): string
    {
        if ($name === null || trim($name) === '') {
            return 'User';
        }

        $parts = preg_split('/\s+/', trim($name));

        return $parts[0] ?? 'User';
    }
}
