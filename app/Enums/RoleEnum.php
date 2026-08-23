<?php

namespace App\Enums;

enum RoleEnum: string
{
    case Administrator = 'Administrator';
    case Manager = 'Manager';
    case Counselor = 'Counselor';
    case FinanceOfficer = 'Finance Officer';
    case Receptionist = 'Receptionist';
}
