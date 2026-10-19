<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class CalendarEventsRequest extends FormRequest
{
    public const MAX_RANGE_DAYS = 62;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('task.view') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start', $this->withinMaxRange(...)],
            'mine' => ['nullable', 'boolean'],
        ];
    }

    private function withinMaxRange(string $attribute, mixed $value, Closure $fail): void
    {
        $start = $this->input('start');

        if (! is_string($start) || ! is_string($value) || CarbonImmutable::hasFormat($start, 'Y-m-d') === false) {
            return;
        }

        if (CarbonImmutable::parse($start)->diffInDays(CarbonImmutable::parse($value)) > self::MAX_RANGE_DAYS) {
            $fail('The calendar range may span at most '.self::MAX_RANGE_DAYS.' days.');
        }
    }
}
