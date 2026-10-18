import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Keyboard key hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd>.
 */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
    return (
        <kbd
            className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-card px-1.5 font-mono text-[11px] leading-none font-medium text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}
