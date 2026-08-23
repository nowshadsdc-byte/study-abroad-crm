import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import * as users from '@/routes/users';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    job_title: string | null;
    is_active: boolean;
    role: string | null;
};

type Props = {
    users: ManagedUser[];
    roles: string[];
};

function RoleSelect({
    roles,
    currentRole,
}: {
    roles: string[];
    currentRole?: string | null;
}) {
    return (
        <select
            name="role"
            defaultValue={currentRole ?? ''}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
            <option value="" disabled>
                Select a role
            </option>
            {roles.map((role) => (
                <option key={role} value={role}>
                    {role}
                </option>
            ))}
        </select>
    );
}

export default function UsersIndex({ users: managedUsers, roles }: Props) {
    return (
        <>
            <Head title="User Access" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="User Access"
                    description="Create staff accounts and assign the role that controls their access."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Add user</CardTitle>
                        <CardDescription>
                            New accounts are assigned a role immediately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...users.store.form()}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" name="name" required />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Password
                                        </Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                        />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">
                                            Confirm password
                                        </Label>
                                        <Input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type="password"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Role</Label>
                                        <RoleSelect roles={roles} />
                                        <InputError message={errors.role} />
                                    </div>
                                    <div className="flex items-end">
                                        <Button disabled={processing}>
                                            Create user
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {managedUsers.map((user) => (
                        <Card key={user.id}>
                            <CardContent className="pt-6">
                                <Form
                                    {...users.update.form(user.id)}
                                    className="grid gap-4 sm:grid-cols-2"
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`name-${user.id}`}
                                                >
                                                    Name
                                                </Label>
                                                <Input
                                                    id={`name-${user.id}`}
                                                    name="name"
                                                    defaultValue={user.name}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`email-${user.id}`}
                                                >
                                                    Email
                                                </Label>
                                                <Input
                                                    id={`email-${user.id}`}
                                                    name="email"
                                                    type="email"
                                                    defaultValue={user.email}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.email}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Role</Label>
                                                <RoleSelect
                                                    roles={roles}
                                                    currentRole={user.role}
                                                />
                                                <InputError
                                                    message={errors.role}
                                                />
                                            </div>
                                            <div className="flex items-end justify-between gap-4">
                                                <Label className="flex items-center gap-2">
                                                    <Checkbox
                                                        name="is_active"
                                                        value="1"
                                                        defaultChecked={
                                                            user.is_active
                                                        }
                                                    />
                                                    Active account
                                                </Label>
                                                <Button disabled={processing}>
                                                    Save access
                                                </Button>
                                            </div>
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

UsersIndex.layout = {
    breadcrumbs: [{ title: 'User Access', href: users.index() }],
};
