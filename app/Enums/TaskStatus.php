<?php

namespace App\Enums;

enum TaskStatus: string
{
    case Pending = 'Pending';
    case InProgress = 'In Progress';
    case OnHold = 'On Hold';
    case Completed = 'Completed';
    case Cancelled = 'Cancelled';

    /**
     * Statuses that still need work.
     *
     * @return array<int, string>
     */
    public static function openValues(): array
    {
        return [self::Pending->value, self::InProgress->value, self::OnHold->value];
    }

    public function isOpen(): bool
    {
        return in_array($this->value, self::openValues(), true);
    }
}
