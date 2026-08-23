import { cn } from '@/lib/utils';

export type TabOption = {
    value: string;
    label: string;
    count?: number;
};

export function TabGroup({
    options,
    value,
    onChange,
}: {
    options: TabOption[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {options.map((option) => {
                const isActive = option.value === value;

                return (
                    <button
                        className={cn(
                            'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        type="button"
                    >
                        {option.label}
                        {option.count !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[11px]',
                                    isActive
                                        ? 'bg-primary-foreground/20'
                                        : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
