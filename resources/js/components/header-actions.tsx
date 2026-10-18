import { router } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    ListTodo,
    Plus,
    Search,
    Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { Kbd } from '@/components/kbd';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/use-permission';
import { AddLeadDialog } from '@/pages/leads/add-lead-dialog';
import { myDay } from '@/routes';
import finance from '@/routes/finance';

function NotificationsMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Notifications"
                    className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <Bell className="size-[18px] stroke-[1.75]" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <DropdownMenuLabel className="px-4 py-3 font-display text-base font-medium">
                    Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="m-0" />
                <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                    <Bell
                        className="mb-2 size-8 stroke-[1.5] text-muted-foreground"
                        aria-hidden="true"
                    />
                    <p className="text-sm font-semibold">
                        You&apos;re all caught up
                    </p>
                    <p className="text-xs text-muted-foreground">
                        New activity on your leads and clients will show up
                        here.
                    </p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Right side of the app top bar: global search (Ctrl+K), the "New lead"
 * split button and notifications.
 */
export function HeaderActions() {
    const { can } = usePermission();
    const canCreateLead = can('lead.create');
    const canRecordPayment = can('finance.edit');
    const canCreateTask = can('task.create');
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent): void => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setIsPaletteOpen((isOpen) => !isOpen);
            }
        };

        window.addEventListener('keydown', handleShortcut);

        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    return (
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                aria-label="Search students, IDs, phone"
                aria-keyshortcuts="Control+K"
                className="hidden h-10 w-72 items-center gap-2 rounded-lg bg-muted px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-border/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex"
            >
                <Search
                    className="size-4 shrink-0 stroke-[1.75]"
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                    Search students, IDs, phone…
                </span>
                <span className="flex shrink-0 gap-1" aria-hidden="true">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                </span>
            </button>
            <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                aria-label="Search"
                aria-keyshortcuts="Control+K"
                className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
            >
                <Search className="size-[18px] stroke-[1.75]" />
            </button>

            {canCreateLead && (
                <div className="inline-flex h-10 overflow-hidden rounded-[10px] bg-primary text-primary-foreground">
                    <button
                        type="button"
                        onClick={() => setIsNewLeadOpen(true)}
                        aria-label="New lead"
                        className="flex items-center gap-2 px-3 text-sm font-semibold transition-colors hover:bg-(--primary-strong) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:px-4"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">New lead</span>
                    </button>
                    {(canRecordPayment || canCreateTask) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="More create actions"
                                    className="grid w-9 place-items-center border-l border-primary-foreground/25 transition-colors hover:bg-(--primary-strong) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                    <ChevronDown className="size-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onSelect={() => setIsNewLeadOpen(true)}
                                >
                                    <Plus />
                                    New lead
                                </DropdownMenuItem>
                                {canCreateTask && (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            router.visit(
                                                myDay({ query: { new: 1 } }),
                                            )
                                        }
                                    >
                                        <ListTodo />
                                        New task
                                    </DropdownMenuItem>
                                )}
                                {canRecordPayment && (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            router.visit(finance.index())
                                        }
                                    >
                                        <Wallet />
                                        Record payment
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <AddLeadDialog
                        open={isNewLeadOpen}
                        onOpenChange={setIsNewLeadOpen}
                        showTrigger={false}
                    />
                </div>
            )}

            <NotificationsMenu />

            <CommandPalette
                open={isPaletteOpen}
                onOpenChange={setIsPaletteOpen}
                onNewLead={() => setIsNewLeadOpen(true)}
            />
        </div>
    );
}
