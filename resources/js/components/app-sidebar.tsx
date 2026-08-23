import { Link } from '@inertiajs/react';
import {
    BadgeDollarSign,
    BookOpen,
    Building2,
    ContactRound,
    FolderGit2,
    GraduationCap,
    LayoutGrid,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import candidates from '@/routes/candidates';
import finance from '@/routes/finance';
import leads from '@/routes/leads';
import opportunities from '@/routes/opportunities';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Leads',
        href: leads.index(),
        icon: ContactRound,
    },
    {
        title: 'Candidates',
        href: candidates.index(),
        icon: GraduationCap,
    },
    {
        title: 'Finance',
        href: finance.index(),
        icon: BadgeDollarSign,
    },
    {
        title: 'Opportunities',
        href: opportunities.index(),
        icon: Building2,
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: FolderGit2,
    // },
    // {
    //     title: 'Documentation',
    //     href: 'https://laravel.com/docs/starter-kits#react',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    const { can } = usePermission();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={mainNavItems.filter((item) => {
                        const permissions: Record<string, string> = {
                            Dashboard: 'dashboard.view',
                            Leads: 'lead.view',
                            Candidates: 'candidate.view',
                            Finance: 'finance.view',
                            Opportunities: 'opportunity.view',
                        };

                        return can(permissions[item.title]);
                    })}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
