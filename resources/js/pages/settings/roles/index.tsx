import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as roles from '@/routes/roles';

type Role = {
    id: number;
    name: string;
    is_system: boolean;
    users_count: number;
    permissions: string[];
};

type Props = {
    roles: Role[];
    permissionGroups: Record<string, string[]>;
};

function PermissionFields({
    permissionGroups,
    selected,
}: {
    permissionGroups: Record<string, string[]>;
    selected: string[];
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(permissionGroups).map(([group, permissions]) => (
                <fieldset key={group} className="rounded-lg border p-3">
                    <legend className="px-1 text-xs font-medium text-muted-foreground capitalize">
                        {group}
                    </legend>
                    <div className="grid gap-2 pt-1">
                        {permissions.map((permission) => (
                            <Label
                                key={permission}
                                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                            >
                                <Checkbox
                                    defaultChecked={selected.includes(
                                        permission,
                                    )}
                                    name="permissions[]"
                                    value={permission}
                                />
                                {permission}
                            </Label>
                        ))}
                    </div>
                </fieldset>
            ))}
        </div>
    );
}

export default function RolesIndex({
    roles: roleList,
    permissionGroups,
}: Props) {
    return (
        <>
            <Head title="Roles & Permissions" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Roles & Permissions"
                    description="Create roles and control the actions each role can perform."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Create role</CardTitle>
                        <CardDescription>
                            Assign one or more permissions when creating a
                            custom role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...roles.store.form()} className="space-y-4">
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role-name">
                                            Role name
                                        </Label>
                                        <Input
                                            id="role-name"
                                            name="name"
                                            required
                                            placeholder="Admissions coordinator"
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <PermissionFields
                                        permissionGroups={permissionGroups}
                                        selected={[]}
                                    />
                                    <Button disabled={processing}>
                                        Create role
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                <div className="flex gap-4 overflow-x-auto pb-2">
                    {roleList.map((role) => (
                        <Card key={role.id} className="w-[min(100%,30rem)] shrink-0">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>{role.name}</CardTitle>
                                        <CardDescription>
                                            {role.users_count} assigned user
                                            {role.users_count === 1 ? '' : 's'}
                                        </CardDescription>
                                    </div>
                                    {role.is_system && (
                                        <Badge variant="secondary">
                                            Built-in
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Form
                                    {...roles.update.form(role.id)}
                                    className="space-y-4"
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`role-${role.id}`}
                                                >
                                                    Role name
                                                </Label>
                                                <Input
                                                    id={`role-${role.id}`}
                                                    name="name"
                                                    defaultValue={role.name}
                                                    disabled={role.is_system}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>
                                            <PermissionFields
                                                permissionGroups={
                                                    permissionGroups
                                                }
                                                selected={role.permissions}
                                            />
                                            <Button disabled={processing}>
                                                Save permissions
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

RolesIndex.layout = {
    breadcrumbs: [{ title: 'Roles & Permissions', href: roles.index() }],
};
