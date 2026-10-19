import { GraduationCap, UserRoundSearch, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import { MIN_RECORD_QUERY_LENGTH, searchRecords } from '@/lib/record-search';
import type { RecordHit } from '@/lib/record-search';
import type { TaskStudent } from '@/types';

type StudentType = TaskStudent['type'];

/**
 * Search-and-pick a lead or client. Only the types the viewer may see are
 * offered; pass `types` to narrow them further (e.g. leads only).
 */
export function StudentPicker({
    value,
    onChange,
    error,
    inputId = 'task-student',
    types: allowedTypes = ['lead', 'client'],
}: {
    value: TaskStudent | null;
    onChange: (student: TaskStudent | null) => void;
    error?: string;
    inputId?: string;
    types?: StudentType[];
}) {
    const { can } = usePermission();
    const types = allowedTypes.filter((type) =>
        can(type === 'lead' ? 'lead.view' : 'candidate.view'),
    );
    const [type, setType] = useState<StudentType>(types[0] ?? 'lead');
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<{ key: string; items: RecordHit[] }>({
        key: '',
        items: [],
    });
    const listId = useId();
    const trimmed = query.trim();
    const searchKey = `${type}:${trimmed}`;
    const shouldSearch = trimmed.length >= MIN_RECORD_QUERY_LENGTH;

    useEffect(() => {
        if (!shouldSearch) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const items = await searchRecords(
                    type,
                    trimmed,
                    controller.signal,
                );
                setHits({ key: searchKey, items });
            } catch {
                if (!controller.signal.aborted) {
                    setHits({ key: searchKey, items: [] });
                }
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [shouldSearch, type, trimmed, searchKey]);

    if (types.length === 0) {
        return null;
    }

    if (value) {
        const Icon = value.type === 'lead' ? UserRoundSearch : GraduationCap;

        return (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <span className="truncate font-medium">{value.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                    {value.type}
                </span>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label={`Remove link to ${value.name}`}
                    className="ml-auto grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        );
    }

    const results = hits.key === searchKey ? hits.items : [];
    const isSearching = shouldSearch && hits.key !== searchKey;

    return (
        <div className="grid gap-2">
            <div className="flex gap-2">
                {types.length > 1 && (
                    <Select
                        value={type}
                        onValueChange={(next) => setType(next as StudentType)}
                    >
                        <SelectTrigger
                            className="w-[110px]"
                            aria-label="Student type"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                <Input
                    id={inputId}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${type === 'lead' ? 'leads' : 'clients'} by name or phone`}
                    aria-controls={listId}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                />
            </div>
            {shouldSearch && (
                <ul
                    id={listId}
                    aria-label="Matching students"
                    className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1"
                >
                    {isSearching && (
                        <li className="px-3 py-2 text-xs text-muted-foreground">
                            Searching…
                        </li>
                    )}
                    {!isSearching && results.length === 0 && (
                        <li className="px-3 py-2 text-xs text-muted-foreground">
                            No {type === 'lead' ? 'leads' : 'clients'} match “
                            {trimmed}”.
                        </li>
                    )}
                    {results.map((hit) => (
                        <li key={hit.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange({
                                        type,
                                        id: hit.id,
                                        name: hit.name,
                                    });
                                    setQuery('');
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                            >
                                <span className="truncate">{hit.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {hit.phone ?? hit.email}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
