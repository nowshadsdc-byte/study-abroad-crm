import { Link, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/use-permission';
import { visibleNavGroups } from '@/lib/navigation';
import { dashboard } from '@/routes';

function SidebarBrand() {
    const { name, settings } = usePage<{
        name: string;
        settings?: { site_name?: string; site_logo?: string };
    }>().props;
    const siteName = settings?.site_name || name;
    const markSource = settings?.site_logo
        ? `/storage/${settings.site_logo}`
        : '/logo-mark.svg';

    return (
        <>
            <img
                src={markSource}
                onError={(event) => {
                    event.currentTarget.src = '/logo-mark.svg';
                }}
                alt=""
                className="h-auto w-10 shrink-0 object-contain group-data-[collapsible=icon]:w-6"
            />
            <div className="grid min-w-0 flex-1 gap-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="flex flex-col font-display text-[13px] leading-[1.15] font-black tracking-[0.06em] text-sidebar-foreground uppercase">
                    <span>Confidence</span>
                    <span>
                        Gl<span className="text-sidebar-primary">o</span>bal
                    </span>
                    <span>Education</span>
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                    {siteName}
                </span>
            </div>
        </>
    );
}

export function AppSidebar() {
    const { can } = usePermission();

    const visibleGroups = visibleNavGroups(can);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="px-3 pt-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-auto gap-3 py-1 hover:bg-transparent active:bg-transparent"
                        >
                            <Link href={dashboard()} prefetch>
                                <SidebarBrand />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={visibleGroups} />
                {can('chat.view') && (
                    <SidebarGroup className="px-3 py-0 pt-2">
                        <SidebarGroupLabel className="h-7 px-2 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
                            Communication
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    className="relative h-10 gap-3 px-3 text-sm font-medium text-sidebar-foreground/85 [&>svg]:size-[18px]! [&>svg]:stroke-[1.75]"
                                    tooltip="Inbox"
                                    onClick={() =>
                                        window.dispatchEvent(
                                            new Event('crm:chat:open'),
                                        )
                                    }
                                >
                                    <MessageCircle />
                                    <span>Inbox</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
