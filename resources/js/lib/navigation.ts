import {
    BookOpenText,
    CalendarDays,
    ChartLine,
    FolderOpen,
    GraduationCap,
    House,
    Kanban,
    Landmark,
    Settings,
    Sunrise,
    UserRoundSearch,
    Wallet,
} from 'lucide-react';
import { dashboard, myDay } from '@/routes';
import candidates from '@/routes/candidates';
import finance from '@/routes/finance';
import leads from '@/routes/leads';
import opportunities from '@/routes/opportunities';
import profile from '@/routes/profile';
import type { NavGroup, NavItem } from '@/types';

type PermittedNavItem = NavItem & {
    /** Permission required to see the item; omit for items every user can open. */
    permission?: string;
};

type PermittedNavGroup = Omit<NavGroup, 'items'> & {
    items: PermittedNavItem[];
};

/**
 * App navigation in the order defined by the CRM style guide. Shared by the
 * sidebar and the command palette. Items whose module is not built yet are
 * listed as disabled "Coming soon" entries.
 */
const navGroups: PermittedNavGroup[] = [
    {
        title: 'Workspace',
        items: [
            {
                title: 'Home',
                href: dashboard(),
                icon: House,
                permission: 'dashboard.view',
            },
            {
                title: 'My Day',
                href: myDay(),
                icon: Sunrise,
                permission: 'task.view',
            },
            {
                title: 'Calendar',
                href: '#',
                icon: CalendarDays,
                permission: 'dashboard.view',
                disabled: true,
            },
        ],
    },
    {
        title: 'Students',
        items: [
            {
                title: 'Leads',
                href: leads.index(),
                icon: UserRoundSearch,
                permission: 'lead.view',
            },
            {
                title: 'Clients',
                href: candidates.index(),
                icon: GraduationCap,
                permission: 'candidate.view',
            },
            {
                title: 'Current Applications',
                href: '#',
                icon: Kanban,
                permission: 'candidate.view',
                disabled: true,
            },
            {
                title: 'Documents',
                href: '#',
                icon: FolderOpen,
                permission: 'candidate.view',
                disabled: true,
            },
        ],
    },
    {
        title: 'Network',
        items: [
            {
                title: 'Institutions',
                href: opportunities.index(),
                icon: Landmark,
                permission: 'opportunity.view',
            },
            {
                title: 'Courses',
                href: '#',
                icon: BookOpenText,
                permission: 'opportunity.view',
                disabled: true,
            },
        ],
    },
    {
        title: 'Money',
        items: [
            {
                title: 'Accounts',
                href: finance.index(),
                icon: Wallet,
                permission: 'finance.view',
            },
            {
                title: 'Reports',
                href: '#',
                icon: ChartLine,
                permission: 'finance.view',
                disabled: true,
            },
        ],
    },
    {
        title: 'Admin',
        items: [
            {
                title: 'Settings',
                href: profile.edit(),
                icon: Settings,
            },
        ],
    },
];

/**
 * Navigation groups the current user may see. Groups left empty are dropped.
 */
export function visibleNavGroups(
    can: (permission: string) => boolean,
): NavGroup[] {
    return navGroups
        .map((group) => ({
            title: group.title,
            items: group.items.filter(
                (item) => !item.permission || can(item.permission),
            ),
        }))
        .filter((group) => group.items.length > 0);
}
