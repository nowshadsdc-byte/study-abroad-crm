import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReportSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'overflow-hidden rounded-xl border bg-card shadow-sm print:break-inside-avoid print:rounded-none print:shadow-none',
                className,
            )}
        >
            <header className="border-b px-4 py-3">
                <h2 className="font-display text-base font-semibold tracking-tight">
                    {title}
                </h2>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </header>
            {children}
        </section>
    );
}
