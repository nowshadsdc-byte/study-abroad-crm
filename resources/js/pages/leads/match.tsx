import { Head } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { dashboard } from '@/routes';
import leads from '@/routes/leads';
import { EligibilityMatcher } from './eligibility-matcher';

export default function MatchByStudent() {
    return (
        <>
            <Head title="Match by Student" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <header className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-teal-600 text-primary-foreground">
                        <Sparkles className="size-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                            Network
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Match by Student
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Check a lead or client against every open programme
                            and see the best matches first.
                        </p>
                    </div>
                </header>

                <EligibilityMatcher />
            </div>
        </>
    );
}

MatchByStudent.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Match by Student', href: leads.match() },
    ],
};
