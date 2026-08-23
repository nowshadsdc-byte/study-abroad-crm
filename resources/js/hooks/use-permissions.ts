import { usePermission } from '@/hooks/use-permission';

export function usePermissions() {
    return usePermission();
}
