<?php

namespace App\Enums;

use Carbon\CarbonImmutable;

enum TaskRecurrence: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';

    /**
     * The next due date after the given one. Monthly never overflows (Jan 31 → Feb 28).
     */
    public function nextDueDate(CarbonImmutable $dueDate): CarbonImmutable
    {
        return match ($this) {
            self::Daily => $dueDate->addDay(),
            self::Weekly => $dueDate->addWeek(),
            self::Monthly => $dueDate->addMonthNoOverflow(),
        };
    }
}
