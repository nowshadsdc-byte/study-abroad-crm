import { router, useHttp } from '@inertiajs/react';
import {
    Eye,
    GraduationCap,
    Globe,
    MoreHorizontal,
    Pencil,
    Trash2,
    Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UniversityAvatar } from '@/components/university-avatar';
import { getCountryFlag } from '@/lib/constants';
import universityApi from '@/routes/api/universities';
import universities from '@/routes/universities';
import { EditUniversityDialog } from './edit-university-dialog';
import type { EditableUniversity } from './edit-university-dialog';

export type UniversityCardData = {
    id: number;
    name: string;
    country: string | null;
    city: string | null;
    website: string | null;
    ranking: number | null;
    logo_url: string | null;
    description: string | null;
    programs: string[];
    opportunities_count: number;
    is_active: boolean;
};

export function UniversityCard({
    university,
    canEdit,
    canDelete,
    onChanged,
}: {
    university: UniversityCardData;
    canEdit: boolean;
    canDelete: boolean;
    onChanged: () => void;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const destroyRequest = useHttp<Record<string, never>>(
        universityApi.destroy(university.id),
        {},
    );

    const editableUniversity: EditableUniversity = {
        id: university.id,
        name: university.name,
        country: university.country ?? '',
        city: university.city,
        website: university.website,
        ranking: university.ranking,
        logo_url: university.logo_url,
        description: university.description,
        programs: university.programs,
        is_active: university.is_active,
    };

    const handleDelete = async (): Promise<void> => {
        try {
            await destroyRequest.submit();
            toast.success('University deleted.');
            onChanged();
        } catch {
            toast.error('Unable to delete this university.');
        }
    };

    const visiblePrograms = university.programs.slice(0, 4);
    const overflowCount = university.programs.length - visiblePrograms.length;

    return (
        <Card className="gap-3 py-4 transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-3 px-4">
                <div className="flex items-start justify-between gap-2">
                    <button
                        className="flex flex-1 items-start gap-3 text-left"
                        onClick={() =>
                            router.visit(universities.show(university.id))
                        }
                        type="button"
                    >
                        <UniversityAvatar
                            logoUrl={university.logo_url}
                            name={university.name}
                            size="md"
                        />
                        <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {university.name}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>
                                    {getCountryFlag(university.country)}
                                </span>
                                <span className="truncate">
                                    {[university.city, university.country]
                                        .filter(Boolean)
                                        .join(', ') || 'Location unknown'}
                                </span>
                            </p>
                        </div>
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                aria-label={`Actions for ${university.name}`}
                                size="icon"
                                variant="ghost"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() =>
                                    router.visit(
                                        universities.show(university.id),
                                    )
                                }
                            >
                                <Eye />
                                View university
                            </DropdownMenuItem>
                            {canEdit && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        setEditOpen(true);
                                    }}
                                >
                                    <Pencil />
                                    Edit university
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        setDeleteOpen(true);
                                    }}
                                    variant="destructive"
                                >
                                    <Trash2 />
                                    Delete university
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {(university.ranking || !university.is_active) && (
                    <div className="flex flex-wrap gap-1.5">
                        {university.ranking && (
                            <Badge
                                className="w-fit bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                variant="outline"
                            >
                                <Trophy className="size-3" />
                                World rank #{university.ranking}
                            </Badge>
                        )}
                        {!university.is_active && (
                            <Badge className="w-fit" variant="secondary">
                                Inactive
                            </Badge>
                        )}
                    </div>
                )}

                {university.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                        {university.description}
                    </p>
                )}

                {university.programs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {visiblePrograms.map((program) => (
                            <Badge key={program} variant="secondary">
                                {program}
                            </Badge>
                        ))}
                        {overflowCount > 0 && (
                            <Badge variant="outline">
                                +{overflowCount} more
                            </Badge>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <GraduationCap className="size-3.5" />
                        {university.opportunities_count}{' '}
                        {university.opportunities_count === 1
                            ? 'program'
                            : 'programs'}
                    </span>
                    {university.website && (
                        <a
                            className="flex items-center gap-1 text-primary hover:underline"
                            href={university.website}
                            onClick={(event) => event.stopPropagation()}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <Globe className="size-3.5" />
                            Website
                        </a>
                    )}
                </div>
            </CardContent>

            {canEdit && (
                <EditUniversityDialog
                    canEdit={canEdit}
                    onOpenChange={setEditOpen}
                    onUpdated={onChanged}
                    open={editOpen}
                    trigger={null}
                    university={editableUniversity}
                />
            )}
            {canDelete && (
                <DeleteConfirmDialog
                    description={`This will permanently delete "${university.name}" along with all of its programs and related candidate applications. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onOpenChange={setDeleteOpen}
                    open={deleteOpen}
                    title="Delete this university?"
                />
            )}
        </Card>
    );
}
