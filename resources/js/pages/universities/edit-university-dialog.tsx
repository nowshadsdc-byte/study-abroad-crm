import { useHttp } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import universityApi from '@/routes/api/universities';
import type { UniversityForm } from './add-university-dialog';
import { UniversityFormFields } from './add-university-dialog';

export type EditableUniversity = {
    id: number;
    name: string;
    country: string;
    city: string | null;
    website: string | null;
    ranking: number | null;
    logo_url: string | null;
    description: string | null;
    programs: string[];
    is_active: boolean;
};

function buildForm(university: EditableUniversity): UniversityForm {
    return {
        name: university.name,
        country: university.country,
        city: university.city ?? '',
        website: university.website ?? '',
        ranking: university.ranking ? String(university.ranking) : '',
        logo_url: university.logo_url ?? '',
        description: university.description ?? '',
        programs: (university.programs ?? []).join(', '),
        is_active: university.is_active,
    };
}

export function EditUniversityDialog({
    canEdit,
    university,
    onUpdated,
    onOpenChange,
    open: openProp,
    trigger,
}: {
    canEdit: boolean;
    university: EditableUniversity;
    onUpdated?: () => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    trigger?: React.ReactNode | null;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const { clearErrors, data, errors, processing, setData, submit } =
        useHttp<UniversityForm>(
            universityApi.update(university.id),
            buildForm(university),
        );

    const handleOpenChange = (isOpen: boolean): void => {
        setInternalOpen(isOpen);
        onOpenChange?.(isOpen);

        if (isOpen) {
            setData(buildForm(university));
            clearErrors();
        } else if (!processing) {
            clearErrors();
        }
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        try {
            const response = await submit();

            if (!response) {
                return;
            }

            handleOpenChange(false);
            onUpdated?.();
            toast.success('University updated successfully.');
        } catch {
            toast.error(
                'Unable to update the university. Please review the form and try again.',
            );
        }
    };

    if (!canEdit) {
        return null;
    }

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button type="button" variant="outline">
                            <Pencil />
                            Edit
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5 text-primary" />
                        Edit university
                    </DialogTitle>
                    <DialogDescription>
                        Update this university&apos;s profile.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <UniversityFormFields
                        data={data}
                        errors={errors}
                        idPrefix="edit_"
                        setData={setData}
                    />
                    <DialogFooter>
                        <Button
                            disabled={processing}
                            onClick={() => handleOpenChange(false)}
                            type="button"
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            disabled={processing}
                            type="submit"
                        >
                            {processing ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
