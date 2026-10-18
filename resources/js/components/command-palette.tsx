import { router } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import {
    CircleDashed,
    GraduationCap,
    Plus,
    Search,
    UserRoundSearch,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Kbd } from '@/components/kbd';
import { usePermission } from '@/hooks/use-permission';
import { visibleNavGroups } from '@/lib/navigation';
import { MIN_RECORD_QUERY_LENGTH, searchRecords } from '@/lib/record-search';
import type { RecordHit } from '@/lib/record-search';
import { cn } from '@/lib/utils';
import { myDay } from '@/routes';
import candidates from '@/routes/candidates';
import finance from '@/routes/finance';
import leads from '@/routes/leads';

const SEARCH_DEBOUNCE_MS = 250;

type PaletteEntry = {
    id: string;
    section: string;
    label: string;
    detail?: string | null;
    icon: LucideIcon;
    disabled?: boolean;
    onSelect?: () => void;
};

type SearchResults = {
    query: string;
    leads: RecordHit[];
    clients: RecordHit[];
};

function matchesQuery(label: string, query: string): boolean {
    return label.toLowerCase().includes(query.toLowerCase());
}

function PaletteContent({
    onClose,
    onNewLead,
}: {
    onClose: () => void;
    onNewLead: () => void;
}) {
    const { can } = usePermission();
    const canSearchLeads = can('lead.view');
    const canSearchClients = can('candidate.view');
    const listboxId = useId();
    const optionRefs = useRef(new Map<string, HTMLDivElement>());
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [results, setResults] = useState<SearchResults>({
        query: '',
        leads: [],
        clients: [],
    });

    const trimmedQuery = query.trim();
    const shouldSearch =
        trimmedQuery.length >= MIN_RECORD_QUERY_LENGTH &&
        (canSearchLeads || canSearchClients);
    const isSearching = shouldSearch && results.query !== trimmedQuery;

    useEffect(() => {
        if (!shouldSearch) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const [leadHits, clientHits] = await Promise.all([
                    canSearchLeads
                        ? searchRecords('lead', trimmedQuery, controller.signal)
                        : Promise.resolve([]),
                    canSearchClients
                        ? searchRecords(
                              'client',
                              trimmedQuery,
                              controller.signal,
                          )
                        : Promise.resolve([]),
                ]);

                setResults({
                    query: trimmedQuery,
                    leads: leadHits,
                    clients: clientHits,
                });
            } catch {
                if (!controller.signal.aborted) {
                    setResults({ query: trimmedQuery, leads: [], clients: [] });
                }
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [shouldSearch, trimmedQuery, canSearchLeads, canSearchClients]);

    const entries: PaletteEntry[] = [];

    if (can('lead.create')) {
        entries.push({
            id: 'action-new-lead',
            section: 'Quick actions',
            label: 'New lead',
            icon: Plus,
            onSelect: onNewLead,
        });
    }

    if (can('task.create')) {
        entries.push({
            id: 'action-new-task',
            section: 'Quick actions',
            label: 'New task',
            icon: Plus,
            onSelect: () => router.visit(myDay({ query: { new: 1 } })),
        });
    }

    if (can('finance.edit')) {
        entries.push({
            id: 'action-record-payment',
            section: 'Quick actions',
            label: 'Record payment',
            icon: Plus,
            onSelect: () => router.visit(finance.index()),
        });
    }

    for (const item of visibleNavGroups(can).flatMap((group) => group.items)) {
        entries.push({
            id: `goto-${item.title}`,
            section: 'Go to',
            label: item.title,
            detail: item.disabled ? 'Coming soon' : null,
            icon: item.icon ?? CircleDashed,
            disabled: item.disabled,
            onSelect: item.disabled ? undefined : () => router.visit(item.href),
        });
    }

    const commandEntries = trimmedQuery
        ? entries.filter((entry) => matchesQuery(entry.label, trimmedQuery))
        : entries;

    const visibleResults =
        shouldSearch && results.query === trimmedQuery
            ? results
            : { leads: [], clients: [] };

    const recordEntries: PaletteEntry[] = [
        ...visibleResults.leads.map((hit) => ({
            id: `lead-${hit.id}`,
            section: 'Leads',
            label: hit.name,
            detail: hit.phone ?? hit.email,
            icon: UserRoundSearch,
            onSelect: () => router.visit(leads.show(hit.id)),
        })),
        ...visibleResults.clients.map((hit) => ({
            id: `client-${hit.id}`,
            section: 'Clients',
            label: hit.name,
            detail: hit.phone ?? hit.email,
            icon: GraduationCap,
            onSelect: () => router.visit(candidates.show(hit.id)),
        })),
    ];

    const allEntries = [...recordEntries, ...commandEntries];
    const selectableEntries = allEntries.filter((entry) => !entry.disabled);
    const safeActiveIndex = Math.min(
        activeIndex,
        Math.max(selectableEntries.length - 1, 0),
    );
    const activeEntry = selectableEntries[safeActiveIndex];
    const optionDomId = (entry: PaletteEntry): string =>
        `${listboxId}-${entry.id}`;

    useEffect(() => {
        if (activeEntry) {
            optionRefs.current
                .get(activeEntry.id)
                ?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeEntry]);

    const selectEntry = (entry: PaletteEntry | undefined): void => {
        if (!entry?.onSelect) {
            return;
        }

        onClose();
        entry.onSelect();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        const count = selectableEntries.length;

        if (count === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((safeActiveIndex + 1) % count);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((safeActiveIndex - 1 + count) % count);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            selectEntry(activeEntry);
        }
    };

    const sections = allEntries.reduce<Map<string, PaletteEntry[]>>(
        (grouped, entry) =>
            grouped.set(entry.section, [
                ...(grouped.get(entry.section) ?? []),
                entry,
            ]),
        new Map(),
    );

    return (
        <>
            <div className="flex h-14 items-center gap-3 border-b border-border px-4">
                <Search
                    className="size-[18px] shrink-0 text-muted-foreground"
                    aria-hidden="true"
                />
                <input
                    autoFocus
                    type="text"
                    role="combobox"
                    aria-label="Search students, IDs, phone"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        activeEntry ? optionDomId(activeEntry) : undefined
                    }
                    placeholder="Search students, IDs, phone…"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                />
                <DialogPrimitive.Close
                    aria-label="Close search"
                    className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <Kbd>Esc</Kbd>
                </DialogPrimitive.Close>
            </div>

            <div
                id={listboxId}
                role="listbox"
                aria-label="Search results and actions"
                className="max-h-[min(440px,60vh)] overflow-y-auto p-2"
            >
                {isSearching && (
                    <p className="px-3 py-2 text-[13px] text-muted-foreground">
                        Searching…
                    </p>
                )}

                {!isSearching && allEntries.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No matches for “{trimmedQuery}”.
                    </p>
                )}

                {[...sections].map(([section, sectionEntries]) => {
                    const headingId = `${listboxId}-${section.replace(/\s+/g, '-')}`;

                    return (
                        <div
                            key={section}
                            role="group"
                            aria-labelledby={headingId}
                        >
                            <p
                                id={headingId}
                                className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                {section}
                            </p>
                            {sectionEntries.map((entry) => {
                                const isActive = entry.id === activeEntry?.id;
                                const Icon = entry.icon;

                                return (
                                    <div
                                        key={entry.id}
                                        id={optionDomId(entry)}
                                        ref={(element) => {
                                            if (element) {
                                                optionRefs.current.set(
                                                    entry.id,
                                                    element,
                                                );
                                            } else {
                                                optionRefs.current.delete(
                                                    entry.id,
                                                );
                                            }
                                        }}
                                        role="option"
                                        aria-selected={isActive}
                                        aria-disabled={
                                            entry.disabled || undefined
                                        }
                                        className={cn(
                                            'flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-foreground transition-colors',
                                            isActive &&
                                                'bg-accent text-accent-foreground',
                                            entry.disabled &&
                                                'cursor-not-allowed opacity-55',
                                        )}
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onMouseMove={() => {
                                            const index =
                                                selectableEntries.indexOf(
                                                    entry,
                                                );

                                            if (
                                                index !== -1 &&
                                                index !== safeActiveIndex
                                            ) {
                                                setActiveIndex(index);
                                            }
                                        }}
                                        onClick={() => selectEntry(entry)}
                                    >
                                        <Icon
                                            className="size-[18px] shrink-0 stroke-[1.75] text-primary"
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">
                                            {entry.label}
                                        </span>
                                        {entry.detail && (
                                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                                {entry.detail}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/**
 * Global search and command menu (Ctrl+K). Searches leads and clients by
 * name, email or phone, and offers quick actions and navigation.
 */
export function CommandPalette({
    open,
    onOpenChange,
    onNewLead,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNewLead: () => void;
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[576px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
                >
                    <DialogPrimitive.Title className="sr-only">
                        Search and quick actions
                    </DialogPrimitive.Title>
                    <PaletteContent
                        onClose={() => onOpenChange(false)}
                        onNewLead={onNewLead}
                    />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
