import { cn } from '@/lib/utils';

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'size-8 text-xs',
    md: 'size-11 text-sm',
    lg: 'size-16 text-xl',
};

function initialsOf(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

export function UniversityAvatar({
    name,
    logoUrl,
    size = 'md',
    className,
}: {
    name: string;
    logoUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    if (logoUrl) {
        return (
            <img
                alt={name}
                className={cn(
                    'shrink-0 rounded-xl border object-cover',
                    sizeClasses[size],
                    className,
                )}
                src={logoUrl}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-teal-600 font-semibold text-primary-foreground',
                sizeClasses[size],
                className,
            )}
        >
            {initialsOf(name)}
        </div>
    );
}
