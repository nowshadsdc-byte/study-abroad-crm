import { router, useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Download,
    Eye,
    FileText,
    Maximize2,
    Minimize2,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import candidateApi from '@/routes/api/candidates';

type DocumentRecord = {
    id: number;
    name: string;
    type: string;
    file_url: string;
    status: string;
    notes: string | null;
    uploaded_at: string;
};

const documentTypes = [
    'Passport',
    'Transcript',
    'Certificate',
    'IELTS',
    'SOP',
    'Recommendation',
    'Photo',
    'Bank Statement',
    'Other',
];

export function DocumentsCard({
    candidateId,
    documents,
    canEdit = true,
    onChanged,
    compact = false,
}: {
    candidateId: number;
    documents: DocumentRecord[];
    canEdit?: boolean;
    onChanged?: () => void;
    compact?: boolean;
}) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const statusForm = useHttp<{ status: string }>({ status: '' });
    const deleteForm = useHttp<Record<string, never>>({});

    // Upload form state
    const [name, setName] = useState('');
    const [type, setType] = useState('Passport');
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');

    const isPdf = (doc: DocumentRecord) =>
        doc.file_url?.split(/[?#]/)[0]?.toLowerCase().endsWith('.pdf') ?? false;

    const previewUrl = (doc: DocumentRecord) =>
        candidateApi.documents.preview([candidateId, doc.id]).url;
    const downloadUrl = (doc: DocumentRecord) =>
        candidateApi.documents.download([candidateId, doc.id]).url;

    const handlePreview = (doc: DocumentRecord) => {
        if (isPdf(doc)) {
            setPreviewDoc(doc);
        } else {
            window.open(previewUrl(doc), '_blank', 'noopener,noreferrer');
        }
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            return toast.error('Please select a file');
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);
        formData.append('file', file);

        if (notes) {
            formData.append('notes', notes);
        }

        router.post(candidateApi.documents.store(candidateId).url, formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success('Document uploaded');
                setUploadOpen(false);
                setFile(null);
                setName('');
                setNotes('');
                onChanged?.();
            },
            onError: () => toast.error('Failed to upload document'),
            onFinish: () => setUploading(false),
        });
    };

    const updateStatus = async (docId: number, status: string) => {
        if (!canEdit) {
            return;
        }

        statusForm.setData('status', status);

        try {
            await statusForm.patch(
                candidateApi.documents.update([candidateId, docId]).url,
            );
            toast.success(`Document status updated to ${status} successfully.`);
            onChanged?.();
        } catch {
            toast.error('Failed to update document status.');
        }
    };

    const deleteDocument = async (docId: number) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await deleteForm.delete(
                candidateApi.documents.destroy([candidateId, docId]).url,
            );
            toast.success('Document deleted successfully.');
            onChanged?.();
        } catch {
            toast.error('Failed to delete document.');
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'Verified') {
            return 'default';
        }

        if (status === 'Rejected') {
            return 'destructive';
        }

        return 'secondary';
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>
                        {compact ? 'Upload Student Document' : 'Documents'}
                    </CardTitle>
                    <CardDescription>
                        {compact
                            ? 'Keep application files and supporting records together.'
                            : 'Required files and verification status'}
                    </CardDescription>
                </div>
                {canEdit && (
                    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                className="bg-linear-to-br from-primary to-teal-600"
                            >
                                <Plus className="mr-1 size-4" />
                                {compact ? 'Attach Document' : 'Add Document'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload Document</DialogTitle>
                                <DialogDescription>
                                    Add a new document for this candidate.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <Label>Document Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                        placeholder="e.g. Passport Copy"
                                    />
                                </div>
                                <div>
                                    <Label>Type</Label>
                                    <Select
                                        value={type}
                                        onValueChange={setType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {documentTypes.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>File (Max 10MB)</Label>
                                    <Input
                                        type="file"
                                        onChange={(e) =>
                                            setFile(e.target.files?.[0] || null)
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Notes (Optional)</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                        placeholder="Any special notes..."
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setUploadOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={uploading}>
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {compact ? (
                    <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                            <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                                {documents.length} document
                                {documents.length === 1 ? '' : 's'} on file
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {
                                    documents.filter(
                                        (document) =>
                                            document.status === 'Verified',
                                    ).length
                                }{' '}
                                verified
                            </p>
                        </div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <FileText className="mb-2 size-8 opacity-50" />
                        <p className="text-sm">No documents uploaded yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
                            >
                                <div className="flex w-full items-start gap-3">
                                    <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                                        <FileText className="size-5" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">
                                                {doc.name}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className="h-5 text-[10px]"
                                            >
                                                {doc.type}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-3 text-xs text-muted-foreground">
                                            <span>
                                                Uploaded{' '}
                                                {formatDistanceToNow(
                                                    new Date(doc.uploaded_at),
                                                    { addSuffix: true },
                                                )}
                                            </span>
                                            {doc.notes && (
                                                <span>• {doc.notes}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                                    {canEdit ? (
                                        <Select
                                            value={doc.status}
                                            onValueChange={(val) =>
                                                updateStatus(doc.id, val)
                                            }
                                        >
                                            <SelectTrigger
                                                className={`h-8 w-27.5 text-xs ${doc.status === 'Rejected' ? 'border-destructive text-destructive' : ''}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pending">
                                                    Pending
                                                </SelectItem>
                                                <SelectItem value="Verified">
                                                    Verified
                                                </SelectItem>
                                                <SelectItem value="Rejected">
                                                    Rejected
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge
                                            variant={
                                                getStatusColor(
                                                    doc.status,
                                                ) as any
                                            }
                                        >
                                            {doc.status}
                                        </Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePreview(doc)}
                                        title="Preview"
                                    >
                                        <Eye className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <a
                                            href={downloadUrl(doc)}
                                            title="Download"
                                        >
                                            <Download className="size-4" />
                                        </a>
                                    </Button>
                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                deleteDocument(doc.id)
                                            }
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog
                open={!!previewDoc}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewDoc(null);
                        setIsPreviewFullscreen(false);
                    }
                }}
            >
                <DialogContent
                    className={
                        isPreviewFullscreen
                            ? 'h-screen w-screen max-w-none rounded-none'
                            : 'max-w-3xl'
                    }
                >
                    <Button
                        className="absolute top-4 right-12"
                        onClick={() => setIsPreviewFullscreen((prev) => !prev)}
                        size="icon"
                        title={
                            isPreviewFullscreen
                                ? 'Exit full screen'
                                : 'Full screen'
                        }
                        type="button"
                        variant="ghost"
                    >
                        {isPreviewFullscreen ? (
                            <Minimize2 className="size-4" />
                        ) : (
                            <Maximize2 className="size-4" />
                        )}
                    </Button>
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.name}</DialogTitle>
                        <DialogDescription>PDF preview</DialogDescription>
                    </DialogHeader>
                    {previewDoc && (
                        <iframe
                            src={previewUrl(previewDoc)}
                            title={previewDoc.name}
                            className={
                                isPreviewFullscreen
                                    ? 'h-[calc(100vh-160px)] w-full rounded-lg border'
                                    : 'h-[75vh] w-full rounded-lg border'
                            }
                        />
                    )}
                    <DialogFooter>
                        <Button variant="outline" asChild>
                            <a
                                href={
                                    previewDoc ? downloadUrl(previewDoc) : '#'
                                }
                            >
                                <Download className="mr-1 size-4" /> Download
                            </a>
                        </Button>
                        <Button onClick={() => setPreviewDoc(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
