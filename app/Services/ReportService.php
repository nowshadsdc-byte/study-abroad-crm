<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\CandidateApplication;
use App\Models\CandidateProgress;
use App\Models\InvoicePayment;
use App\Models\Lead;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Management reporting over a business-local period (Asia/Dhaka by default).
 * Every section is a single grouped query; "converted" means a lead has a linked
 * client record (archived records included, since they are still history).
 *
 * @phpstan-type ReportPeriod array{key: string, label: string, from: string|null, to: string|null}
 */
class ReportService
{
    public const PERIODS = [
        'this_month' => 'This month',
        'last_30_days' => 'Last 30 days',
        'this_quarter' => 'This quarter',
        'year_to_date' => 'Year to date',
        'last_year' => 'Last year',
        'all_time' => 'All time',
    ];

    private const HAS_CLIENT = 'exists (select 1 from candidates c where c.lead_id = leads.id)';

    private const HAS_PAYMENT = 'exists (select 1 from candidates c join invoices i on i.candidate_id = c.id join invoice_payments p on p.invoice_id = i.id where c.lead_id = leads.id)';

    private const HAS_LODGED = "exists (select 1 from candidates c join candidate_applications a on a.candidate_id = c.id where c.lead_id = leads.id and a.status <> 'Draft')";

    private const HAS_OFFER = "exists (select 1 from candidates c where c.lead_id = leads.id and (exists (select 1 from candidate_progress cp where cp.candidate_id = c.id and cp.step = 'Offer' and cp.status = 'Completed') or exists (select 1 from candidate_applications a where a.candidate_id = c.id and a.status = 'Accepted')))";

    private const HAS_VISA_APPROVED = "exists (select 1 from candidates c join candidate_progress cp on cp.candidate_id = c.id where c.lead_id = leads.id and cp.step = 'Visa' and cp.outcome = 'Approved')";

    private const HAS_ENROLLED = "exists (select 1 from candidates c join candidate_progress cp on cp.candidate_id = c.id where c.lead_id = leads.id and cp.step = 'Enrollment' and cp.status = 'Completed')";

    /** Start (inclusive) and end (exclusive) as business-local dates; null means unbounded. */
    private ?string $from = null;

    private ?string $until = null;

    /**
     * @return array<string, mixed>
     */
    public function build(string $periodKey): array
    {
        $today = CarbonImmutable::now(config('app.business_timezone'))->startOfDay();
        [$from, $until] = $this->resolvePeriod($periodKey, $today);
        $this->from = $from?->toDateString();
        $this->until = $until?->toDateString();

        return [
            'period' => [
                'key' => $periodKey,
                'label' => self::PERIODS[$periodKey],
                'from' => $this->from,
                'to' => $until?->subDay()->toDateString(),
            ],
            'generated_at' => $today->toDateString(),
            'kpis' => $this->kpis(),
            'channels' => $this->channels(),
            'funnel' => $this->funnel(),
            'destinations' => $this->destinations(),
        ];
    }

    /**
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null}
     */
    private function resolvePeriod(string $periodKey, CarbonImmutable $today): array
    {
        $tomorrow = $today->addDay();

        return match ($periodKey) {
            'this_month' => [$today->startOfMonth(), $tomorrow],
            'last_30_days' => [$today->subDays(29), $tomorrow],
            'this_quarter' => [$today->startOfQuarter(), $tomorrow],
            'year_to_date' => [$today->startOfYear(), $tomorrow],
            'last_year' => [$today->subYear()->startOfYear(), $today->startOfYear()],
            default => [null, null],
        };
    }

    /**
     * @return array<string, int|float|null>
     */
    private function kpis(): array
    {
        $leads = $this->leadCohort()
            ->selectRaw('count(*) as leads, sum(case when '.self::HAS_CLIENT.' then 1 else 0 end) as converted')
            ->toBase()
            ->first();

        $visa = CandidateProgress::query()
            ->where('step', 'Visa')
            ->whereIn('outcome', CandidateProgress::VISA_OUTCOMES)
            ->tap(fn (Builder $query) => $this->inPeriod($query, 'completed_at'))
            ->selectRaw("sum(case when outcome = 'Approved' then 1 else 0 end) as approved, sum(case when outcome = 'Refused' then 1 else 0 end) as refused")
            ->toBase()
            ->first();

        $approved = (int) $visa->approved;
        $refused = (int) $visa->refused;

        return [
            'leads' => (int) $leads->leads,
            'converted' => (int) $leads->converted,
            'conversion_rate' => $this->rate((int) $leads->converted, (int) $leads->leads),
            'clients' => Candidate::withTrashed()->tap(fn (Builder $query) => $this->inPeriod($query, 'created_at'))->count(),
            'applications_lodged' => CandidateApplication::query()->where('status', '<>', 'Draft')->tap(fn (Builder $query) => $this->inPeriod($query, 'applied_at'))->count(),
            'visa_approved' => $approved,
            'visa_refused' => $refused,
            'visa_rate' => $this->rate($approved, $approved + $refused),
            'collections' => round((float) InvoicePayment::query()->tap(fn (Builder $query) => $this->inPeriod($query, 'paid_at', isDateColumn: true))->sum('amount'), 2),
        ];
    }

    /**
     * Leads captured per source, with how many became clients and how many paid.
     *
     * @return array<int, array{source: string, leads: int, converted: int, paid_clients: int, conversion_rate: float|null, efficiency: float|null}>
     */
    private function channels(): array
    {
        return $this->leadCohort()
            ->selectRaw('source, count(*) as leads, sum(case when '.self::HAS_CLIENT.' then 1 else 0 end) as converted, sum(case when '.self::HAS_PAYMENT.' then 1 else 0 end) as paid_clients')
            ->groupBy('source')
            ->toBase()
            ->get()
            ->map(fn (object $row): array => [
                'source' => $row->source ?: 'Unknown',
                'leads' => (int) $row->leads,
                'converted' => (int) $row->converted,
                'paid_clients' => (int) $row->paid_clients,
                'conversion_rate' => $this->rate((int) $row->converted, (int) $row->leads),
                'efficiency' => $this->rate((int) $row->paid_clients, (int) $row->leads),
            ])
            ->sortBy([['leads', 'desc'], ['source', 'asc']])
            ->values()
            ->all();
    }

    /**
     * How far the leads captured in the period have travelled through the pipeline.
     *
     * @return array<int, array{stage: string, count: int, rate_of_leads: float|null, rate_of_previous: float|null}>
     */
    private function funnel(): array
    {
        $stages = [
            'Leads captured' => 'count(*)',
            'Contacted' => "sum(case when status <> 'New' then 1 else 0 end)",
            'Qualified' => "sum(case when status in ('Qualified', 'Converted') then 1 else 0 end)",
            'Converted to client' => 'sum(case when '.self::HAS_CLIENT.' then 1 else 0 end)',
            'Application lodged' => 'sum(case when '.self::HAS_LODGED.' then 1 else 0 end)',
            'Offer received' => 'sum(case when '.self::HAS_OFFER.' then 1 else 0 end)',
            'Visa approved' => 'sum(case when '.self::HAS_VISA_APPROVED.' then 1 else 0 end)',
            'Enrolled' => 'sum(case when '.self::HAS_ENROLLED.' then 1 else 0 end)',
        ];

        $columns = collect(array_values($stages))->map(fn (string $expression, int $index): string => "{$expression} as stage_{$index}")->implode(', ');
        $row = (array) $this->leadCohort()->selectRaw($columns)->toBase()->first();
        $counts = collect(array_keys($stages))->map(fn (string $stage, int $index): int => (int) ($row["stage_{$index}"] ?? 0));
        $leads = $counts->first();

        return collect(array_keys($stages))->map(fn (string $stage, int $index): array => [
            'stage' => $stage,
            'count' => $counts[$index],
            'rate_of_leads' => $this->rate($counts[$index], $leads),
            'rate_of_previous' => $index === 0 ? null : $this->rate($counts[$index], $counts[$index - 1]),
        ])->all();
    }

    /**
     * Clients enrolled in the period grouped by their desired study destination.
     *
     * @return array<int, array{country: string, clients: int, lodged: int, visa_approved: int, visa_refused: int, visa_rate: float|null, collections: float}>
     */
    private function destinations(): array
    {
        $paymentBindings = [];
        $paymentWindow = '';

        if ($this->from !== null) {
            $paymentWindow .= ' and p.paid_at >= ?';
            $paymentBindings[] = $this->from;
        }

        if ($this->until !== null) {
            $paymentWindow .= ' and p.paid_at < ?';
            $paymentBindings[] = $this->until;
        }

        return Candidate::withTrashed()
            ->tap(fn (Builder $query) => $this->inPeriod($query, 'candidates.created_at'))
            ->selectRaw(implode(', ', [
                "coalesce(nullif(desired_country, ''), 'Not specified') as country",
                'count(*) as clients',
                "sum(case when exists (select 1 from candidate_applications a where a.candidate_id = candidates.id and a.status <> 'Draft') then 1 else 0 end) as lodged",
                "sum(case when exists (select 1 from candidate_progress cp where cp.candidate_id = candidates.id and cp.step = 'Visa' and cp.outcome = 'Approved') then 1 else 0 end) as visa_approved",
                "sum(case when exists (select 1 from candidate_progress cp where cp.candidate_id = candidates.id and cp.step = 'Visa' and cp.outcome = 'Refused') then 1 else 0 end) as visa_refused",
                "sum((select coalesce(sum(p.amount), 0) from invoices i join invoice_payments p on p.invoice_id = i.id where i.candidate_id = candidates.id{$paymentWindow})) as collections",
            ]), $paymentBindings)
            ->groupByRaw("coalesce(nullif(desired_country, ''), 'Not specified')")
            ->toBase()
            ->get()
            ->map(fn (object $row): array => [
                'country' => $row->country,
                'clients' => (int) $row->clients,
                'lodged' => (int) $row->lodged,
                'visa_approved' => (int) $row->visa_approved,
                'visa_refused' => (int) $row->visa_refused,
                'visa_rate' => $this->rate((int) $row->visa_approved, (int) $row->visa_approved + (int) $row->visa_refused),
                'collections' => round((float) $row->collections, 2),
            ])
            ->sortBy([['clients', 'desc'], ['country', 'asc']])
            ->values()
            ->all();
    }

    /**
     * @return Builder<Lead>
     */
    private function leadCohort(): Builder
    {
        return Lead::withTrashed()->tap(fn (Builder $query) => $this->inPeriod($query, 'leads.created_at'));
    }

    /**
     * Restrict a query to the period. Timestamps are stored in UTC, so the business-local
     * day boundaries are converted first; plain date columns compare as-is.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     */
    private function inPeriod(Builder $query, string $column, bool $isDateColumn = false): void
    {
        $timezone = config('app.business_timezone');
        $bound = fn (string $date): string => $isDateColumn
            ? $date
            : CarbonImmutable::parse($date, $timezone)->utc()->toDateTimeString();

        if ($this->from !== null) {
            $query->where($column, '>=', $bound($this->from));
        }

        if ($this->until !== null) {
            $query->where($column, '<', $bound($this->until));
        }
    }

    private function rate(int $part, int $whole): ?float
    {
        return $whole === 0 ? null : round($part / $whole * 100, 1);
    }
}
