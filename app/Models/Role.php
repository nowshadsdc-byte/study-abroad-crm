<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    /**
     * Built-in roles seeded by the application. These can have their
     * permissions edited, but cannot be renamed or deleted from the UI.
     *
     * @var list<string>
     */
    public const SYSTEM_ROLES = [
        'Administrator',
        'Manager',
        'Counselor',
        'Finance Officer',
        'Receptionist',
    ];

    public function isSystem(): bool
    {
        return in_array($this->name, self::SYSTEM_ROLES, true);
    }
}
