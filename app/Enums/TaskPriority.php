<?php

namespace App\Enums;

enum TaskPriority: string
{
    case Low = 'Low';
    case Medium = 'Medium';
    case High = 'High';
    case Urgent = 'Urgent';
}
