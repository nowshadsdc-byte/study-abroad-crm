import { useHttp } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    ListX,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import candidateApi from '@/routes/api/candidates';

type ImportRowIssue = {
    row: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    reason?: string;
    errors?: string[];
};

type ImportSummary = {
    total: number;
    imported: number;
    duplicates: number;
    failed: number;
    duplicate_rows: ImportRowIssue[];
    failed_rows: ImportRowIssue[];
};

type ImportForm = {
    file: File | null;
};

function csvCell(value: string | number): string {
    const text = String(value);

    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadErrorReport(summary: ImportSummary): void {
    const rows = [
        ['Row', 'Name', 'Email', 'Phone', 'Type', 'Reason'],
        ...summary.duplicate_rows.map((issue) => [
            issue.row,
            issue.name ?? '',
            issue.email ?? '',
            issue.phone ?? '',
            'Duplicate',
            issue.reason ?? '',
        ]),
        ...summary.failed_rows.map((issue) => [
            issue.row,
            issue.name ?? '',
            issue.email ?? '',
            issue.phone ?? '',
            'Invalid',
            (issue.errors ?? []).join('; '),
        ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'candidate_import_errors.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function BulkCandidateImport({ onImported }: { onImported?: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const { data, response, setData, submit, processing } = useHttp<
        ImportForm,
        ImportSummary
    >(candidateApi.import.store(), { file: null });

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected);
        setData('file', selected);
    };

    const handleImport = async (): Promise<void> => {
        if (!data.file) {
            toast.error('Please choose a CSV file to import.');

            return;
        }

        try {
            const summary = await submit();

            if (!summary) {
                return;
            }

            if (summary.imported > 0) {
                onImported?.();
            }

            toast.success(
                `Imported ${summary.imported} of ${summary.total} candidate${summary.total === 1 ? '' : 's'}.`,
            );
        } catch {
            toast.error(
                'Unable to import the file. Please check it and try again.',
            );
        }
    };

    const issues = response
        ? [
              ...response.duplicate_rows.map((issue) => ({
                  ...issue,
                  type: 'Duplicate' as const,
              })),
              ...response.failed_rows.map((issue) => ({
                  ...issue,
                  type: 'Invalid' as const,
              })),
          ].sort((a, b) => a.row - b.row)
        : [];

    return (
        <div className="grid gap-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileSpreadsheet className="size-[18px]" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            Start from the CSV template
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Includes every field the import supports.
                        </p>
                    </div>
                </div>
                <Button asChild type="button" variant="outline">
                    <a download href={candidateApi.import.template().url}>
                        <Download />
                        Download CSV Template
                    </a>
                </Button>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="bulk_candidate_file">Upload completed CSV</Label>
                <Input
                    accept=".csv,text/csv"
                    id="bulk_candidate_file"
                    onChange={handleFileChange}
                    type="file"
                />
                {file && (
                    <p className="text-xs text-muted-foreground">
                        Selected: {file.name}
                    </p>
                )}
            </div>

            <Button
                className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                disabled={processing || !file}
                onClick={() => void handleImport()}
                type="button"
            >
                <Upload />
                {processing ? 'Importing...' : 'Import Candidates'}
            </Button>

            {response && (
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            {
                                label: 'Total Rows',
                                value: response.total,
                                tone: 'bg-muted text-foreground',
                            },
                            {
                                label: 'Imported',
                                value: response.imported,
                                tone: 'bg-primary/10 text-primary',
                            },
                            {
                                label: 'Duplicates',
                                value: response.duplicates,
                                tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            },
                            {
                                label: 'Failed',
                                value: response.failed,
                                tone: 'bg-destructive/10 text-destructive',
                            },
                        ].map((tile) => (
                            <Card className="gap-2 py-3" key={tile.label}>
                                <CardContent className="px-3">
                                    <p className="text-[11px] text-muted-foreground">
                                        {tile.label}
                                    </p>
                                    <p
                                        className={`w-fit rounded px-1.5 text-lg font-semibold tracking-tight ${tile.tone}`}
                                    >
                                        {tile.value}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {issues.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border bg-primary/5 p-4 text-sm text-primary">
                            <CheckCircle2 className="size-4" />
                            All rows imported successfully.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-sm font-medium">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    Skipped rows
                                </p>
                                <Button
                                    onClick={() =>
                                        downloadErrorReport(response)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    <ListX />
                                    Download Error Report
                                </Button>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto rounded-lg border">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 border-b bg-muted/60 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2">Row</th>
                                            <th className="px-3 py-2">Candidate</th>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2">
                                                Reason
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {issues.map((issue) => (
                                            <tr
                                                key={`${issue.type}-${issue.row}`}
                                            >
                                                <td className="px-3 py-2 align-top text-muted-foreground">
                                                    {issue.row}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <p className="font-medium text-foreground">
                                                        {issue.name || '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {[
                                                            issue.email,
                                                            issue.phone,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ') || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <Badge
                                                        variant={
                                                            issue.type ===
                                                            'Duplicate'
                                                                ? 'secondary'
                                                                : 'destructive'
                                                        }
                                                    >
                                                        {issue.type}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 align-top text-muted-foreground">
                                                    {issue.type === 'Duplicate'
                                                        ? issue.reason
                                                        : (
                                                              issue.errors ?? []
                                                          ).join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
