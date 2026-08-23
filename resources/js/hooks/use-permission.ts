import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types/auth';

export function usePermission() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const roles = auth.user?.roles ?? [];
    const permissions = auth.user?.permissions ?? [];

    return {
        can: (permission: string): boolean => permissions.includes(permission),
        hasRole: (role: string): boolean => roles.includes(role),
        permissions,
        roles,
    };
}
