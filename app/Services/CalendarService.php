<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Models\LeadFollowUp;
use App\Models\Opportunity;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * @phpstan-type CalendarEvent array{
 *     id: string,
 *     source: 'task'|'follow_up'|'deadline',
 *     type: string,
 *     title: string,
 *     subtitle: string|null,
 *     date: string,
 *     time: string|null,
 *     status: string|null,
 *     href: string,
 * }
 */
class CalendarService
{
    /**
     * Every calendar event the viewer may see between two business-local dates (inclusive),
     * sorted by date then time (all-day items first).
     *
     * @return array<int, CalendarEvent>
     */
    public function events(User $viewer, string $start, string $end, bool $mineOnly): array
    {
        $endExclusive = CarbonImmutable::parse($end)->addDay()->toDateString();

        $events = [
            ...$viewer->hasPermissionTo('task.view') ? $this->tasks($viewer, $start, $endExclusive, $mineOnly) : [],
            ...$viewer->hasPermissionTo('lead.view') ? $this->followUps($viewer, $start, $endExclusive, $mineOnly) : [],
            ...$viewer->hasPermissionTo('opportunity.view') && ! $mineOnly ? $this->deadlines($start, $endExclusive) : [],
        ];

        usort($events, fn (array $a, array $b): int => [$a['date'], $a['time'] ?? '', $a['title']] <=> [$b['date'], $b['time'] ?? '', $b['title']]);

        return $events;
    }

    /**
     * Supervisors (task.edit_any) see everyone's tasks; everyone else sees the tasks involving them.
     *
     * @return array<int, CalendarEvent>
     */
    private function tasks(User $viewer, string $start, string $endExclusive, bool $mineOnly): array
    {
        return Task::query()
            ->with('lead:id,name', 'candidate:id,name')
            ->where('status', '!=', TaskStatus::Cancelled)
            ->where('due_date', '>=', $start)
            ->where('due_date', '<', $endExclusive)
            ->when($mineOnly || ! $viewer->hasPermissionTo('task.edit_any'), fn (Builder $query) => $query->involving($viewer))
            ->get()
            ->map(fn (Task $task): array => [
                'id' => "task-{$task->id}",
                'source' => 'task',
                'type' => 'Task',
                'title' => $task->title,
                'subtitle' => $task->lead?->name ?? $task->candidate?->name,
                'date' => $task->due_date->toDateString(),
                'time' => $task->due_time ? substr($task->due_time, 0, 5) : null,
                'status' => $task->status->value,
                'href' => route('my-day', ['view' => 'all', 'task' => $task->id], false),
            ])
            ->all();
    }

    /**
     * Logged follow-ups (on follow_up_date) and scheduled ones (on next_follow_up_date).
     * Both are stored in UTC and placed on the calendar in the business timezone.
     *
     * @return array<int, CalendarEvent>
     */
    private function followUps(User $viewer, string $start, string $endExclusive, bool $mineOnly): array
    {
        $timezone = config('app.business_timezone');
        $from = CarbonImmutable::parse($start, $timezone)->utc();
        $until = CarbonImmutable::parse($endExclusive, $timezone)->utc();

        $followUps = LeadFollowUp::query()
            ->with('lead:id,name')
            ->whereHas('lead')
            ->when($mineOnly, fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('created_by_id', $viewer->id)
                ->orWhereHas('lead', fn (Builder $query) => $query->where('assigned_to_id', $viewer->id))))
            ->where(fn (Builder $query) => $query
                ->where(fn (Builder $query) => $query->where('follow_up_date', '>=', $from)->where('follow_up_date', '<', $until))
                ->orWhere(fn (Builder $query) => $query->where('next_follow_up_date', '>=', $from)->where('next_follow_up_date', '<', $until)))
            ->get();

        $events = [];

        foreach ($followUps as $followUp) {
            $leadName = $followUp->lead->name;
            $href = route('leads.show', $followUp->lead_id, false);

            if ($this->isWithin($followUp->follow_up_date, $from, $until)) {
                $events[] = $this->followUpEvent("follow_up-{$followUp->id}", $followUp->type, "{$followUp->type} · {$leadName}", $followUp->outcome, $followUp->follow_up_date, $timezone, $href);
            }

            if ($this->isWithin($followUp->next_follow_up_date, $from, $until)) {
                $events[] = $this->followUpEvent("next_follow_up-{$followUp->id}", $followUp->type, "Follow-up · {$leadName}", 'Scheduled', $followUp->next_follow_up_date, $timezone, $href);
            }
        }

        return $events;
    }

    /**
     * @return array<int, CalendarEvent>
     */
    private function deadlines(string $start, string $endExclusive): array
    {
        return Opportunity::query()
            ->with('university:id,name')
            ->where('deadline', '>=', $start)
            ->where('deadline', '<', $endExclusive)
            ->get()
            ->map(fn (Opportunity $opportunity): array => [
                'id' => "deadline-{$opportunity->id}",
                'source' => 'deadline',
                'type' => 'Deadline',
                'title' => "Deadline · {$opportunity->title}",
                'subtitle' => $opportunity->university?->name,
                'date' => $opportunity->deadline->toDateString(),
                'time' => null,
                'status' => $opportunity->status,
                'href' => route('opportunities.show', $opportunity->id, false),
            ])
            ->all();
    }

    /**
     * @return CalendarEvent
     */
    private function followUpEvent(string $id, string $type, string $title, ?string $status, CarbonInterface $moment, string $timezone, string $href): array
    {
        $local = CarbonImmutable::instance($moment)->setTimezone($timezone);

        return [
            'id' => $id,
            'source' => 'follow_up',
            'type' => $type,
            'title' => $title,
            'subtitle' => null,
            'date' => $local->toDateString(),
            'time' => $local->format('H:i'),
            'status' => $status,
            'href' => $href,
        ];
    }

    private function isWithin(?CarbonInterface $moment, CarbonImmutable $from, CarbonImmutable $until): bool
    {
        return $moment !== null && $moment->greaterThanOrEqualTo($from) && $moment->lessThan($until);
    }
}
