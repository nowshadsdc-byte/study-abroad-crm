import { useHttp } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TabGroup } from '@/components/tab-group';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { COUNTRIES } from '@/lib/constants';
import universityApi from '@/routes/api/universities';
import { BulkUniversityImport } from './bulk-university-import';

export type UniversityForm = {
    name: string;
    country: string;
    city: string;
    website: string;
    ranking: string;
    logo_url: string;
    description: string;
    programs: string;
    is_active: boolean;
};

export const initialUniversityForm: UniversityForm = {
    name: '',
    country: '',
    city: '',
    website: '',
    ranking: '',
    logo_url: '',
    description: '',
    programs: '',
    is_active: true,
};

type FieldProps = {
    children: React.ReactNode;
    error?: string;
    label: string;
    name: string;
};

function Field({ children, error, label, name }: FieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export function UniversityFormFields({
    data,
    errors,
    setData,
    idPrefix = '',
}: {
    data: UniversityForm;
    errors: Partial<Record<keyof UniversityForm, string>>;
    setData: <K extends keyof UniversityForm>(
        key: K,
        value: UniversityForm[K],
    ) => void;
    idPrefix?: string;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field
                error={errors.name}
                label="University name *"
                name={`${idPrefix}name`}
            >
                <Input
                    aria-invalid={Boolean(errors.name)}
                    id={`${idPrefix}name`}
                    onChange={(event) => setData('name', event.target.value)}
                    placeholder="e.g. University of Toronto"
                    value={data.name}
                />
            </Field>
            <Field
                error={errors.country}
                label="Country *"
                name={`${idPrefix}country`}
            >
                <Select
                    onValueChange={(value) => setData('country', value)}
                    value={data.country || undefined}
                >
                    <SelectTrigger
                        aria-invalid={Boolean(errors.country)}
                        className="w-full"
                        id={`${idPrefix}country`}
                    >
                        <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                        {COUNTRIES.map((country) => (
                            <SelectItem key={country.name} value={country.name}>
                                {country.flag} {country.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field error={errors.city} label="City" name={`${idPrefix}city`}>
                <Input
                    aria-invalid={Boolean(errors.city)}
                    id={`${idPrefix}city`}
                    onChange={(event) => setData('city', event.target.value)}
                    placeholder="e.g. Toronto"
                    value={data.city}
                />
            </Field>
            <Field
                error={errors.website}
                label="Website"
                name={`${idPrefix}website`}
            >
                <Input
                    aria-invalid={Boolean(errors.website)}
                    id={`${idPrefix}website`}
                    onChange={(event) => setData('website', event.target.value)}
                    placeholder="https://..."
                    value={data.website}
                />
            </Field>
            <Field
                error={errors.ranking}
                label="World ranking"
                name={`${idPrefix}ranking`}
            >
                <Input
                    aria-invalid={Boolean(errors.ranking)}
                    id={`${idPrefix}ranking`}
                    min="1"
                    onChange={(event) => setData('ranking', event.target.value)}
                    placeholder="e.g. 25"
                    type="number"
                    value={data.ranking}
                />
            </Field>
            <Field
                error={errors.logo_url}
                label="Logo URL"
                name={`${idPrefix}logo_url`}
            >
                <Input
                    aria-invalid={Boolean(errors.logo_url)}
                    id={`${idPrefix}logo_url`}
                    onChange={(event) =>
                        setData('logo_url', event.target.value)
                    }
                    placeholder="https://..."
                    value={data.logo_url}
                />
            </Field>
            <Field
                error={errors.programs}
                label="Programs (comma separated)"
                name={`${idPrefix}programs`}
            >
                <Input
                    aria-invalid={Boolean(errors.programs)}
                    id={`${idPrefix}programs`}
                    onChange={(event) =>
                        setData('programs', event.target.value)
                    }
                    placeholder="Computer Science, Business, Engineering"
                    value={data.programs}
                />
            </Field>
            <Field
                error={errors.description}
                label="About"
                name={`${idPrefix}description`}
            >
                <textarea
                    aria-invalid={Boolean(errors.description)}
                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                    id={`${idPrefix}description`}
                    onChange={(event) =>
                        setData('description', event.target.value)
                    }
                    placeholder="Brief description of the university..."
                    value={data.description}
                />
            </Field>
            <Label className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                    checked={data.is_active}
                    id={`${idPrefix}is_active`}
                    onCheckedChange={(checked) =>
                        setData('is_active', checked === true)
                    }
                />
                Active partner university
            </Label>
        </div>
    );
}

export function AddUniversityDialog({ onCreated }: { onCreated?: () => void }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const { clearErrors, data, errors, processing, reset, setData, submit } =
        useHttp<UniversityForm>(universityApi.store(), initialUniversityForm);

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (!isOpen) {
            setMode('single');

            if (!processing) {
                reset();
                clearErrors();
            }
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

            setOpen(false);
            reset();
            clearErrors();
            onCreated?.();
            toast.success('University saved successfully.');
        } catch {
            toast.error(
                'Unable to save the university. Please review the form and try again.',
            );
        }
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            <DialogTrigger asChild>
                <Button
                    className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                    type="button"
                >
                    <Plus />
                    Add University
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="size-5 text-primary" />
                        Add university
                    </DialogTitle>
                    <DialogDescription>
                        Add a new partner university.
                    </DialogDescription>
                </DialogHeader>

                <TabGroup
                    onChange={(value) =>
                        setMode(value === 'bulk' ? 'bulk' : 'single')
                    }
                    options={[
                        { value: 'single', label: 'Single University' },
                        { value: 'bulk', label: 'Bulk Import' },
                    ]}
                    value={mode}
                />

                {mode === 'bulk' ? (
                    <>
                        <BulkUniversityImport onImported={onCreated} />
                        <DialogFooter>
                            <Button
                                onClick={() => handleOpenChange(false)}
                                type="button"
                                variant="outline"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form className="grid gap-4" onSubmit={handleSubmit}>
                        <UniversityFormFields
                            data={data}
                            errors={errors}
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
                                {processing ? 'Saving...' : 'Save university'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
