import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Metric = {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    tone: string;
};

export function CrmListPage({
    title,
    description,
    metrics,
    headerAction,
}: {
    title: string;
    description: string;
    metrics: Metric[];
    headerAction?: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                <p className="text-xs font-medium tracking-wider text-primary uppercase">
                    Confidence Global Bd CRM
                </p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {title}
                </h1>
                <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {headerAction}
            </header>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon;

                    return (
                        <Card
                            className="gap-3 py-4 transition-shadow hover:shadow-md"
                            key={metric.label}
                        >
                            <CardContent className="flex items-start justify-between px-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        {metric.label}
                                    </p>
                                    <p className="text-2xl font-semibold tracking-tight">
                                        {metric.value}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {metric.detail}
                                    </p>
                                </div>
                                <div
                                    className={`flex size-9 items-center justify-center rounded-lg ${metric.tone}`}
                                >
                                    <Icon className="size-[18px]" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>
        </div>
    );
}
