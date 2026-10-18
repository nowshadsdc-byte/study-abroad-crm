import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup, NavItem } from '@/types';

const itemClassName =
    "relative h-10 gap-3 px-3 text-sm font-medium text-sidebar-foreground/85 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-sidebar-primary before:opacity-0 before:content-[''] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:opacity-100 [&>svg]:size-[18px]! [&>svg]:stroke-[1.75] data-[active=true]:[&>svg]:text-sidebar-primary";

function NavMainItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
    if (item.disabled) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    aria-disabled="true"
                    className={`${itemClassName} cursor-not-allowed opacity-60 hover:bg-transparent hover:text-sidebar-foreground/85`}
                    tooltip={{ children: `${item.title} · Coming soon` }}
                >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                className={itemClassName}
                tooltip={{ children: item.title }}
            >
                <Link
                    href={item.href}
                    prefetch
                    aria-current={isActive ? 'page' : undefined}
                >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            {groups.map((group) => (
                <SidebarGroup key={group.title} className="px-3 py-0 pt-2">
                    <SidebarGroupLabel className="h-7 px-2 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
                        {group.title}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) => (
                            <NavMainItem
                                key={item.title}
                                item={item}
                                isActive={
                                    !item.disabled && isCurrentUrl(item.href)
                                }
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
