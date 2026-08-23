import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Mail, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AppearanceTabs from '@/components/appearance-tabs';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = { auth: Auth };

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const initials = useInitials();

    if (!auth.user) {
        return null;
    }

    const user = auth.user;
    const role = user.roles[0] ?? 'No role assigned';
    const jobTitle =
        typeof user.job_title === 'string' && user.job_title
            ? user.job_title
            : 'CRM team member';
    const shortUserId = `USR-${String(user.id).padStart(5, '0')}`;

    return (
        <>
            <Head title="Profile settings" />
            <div className="space-y-6">
                <Card className="gap-0 overflow-hidden rounded-xl py-0">
                    <div className="h-20 bg-[linear-gradient(135deg,oklch(0.55_0.13_162)_0%,oklch(0.5_0.12_180)_100%)]" />
                    <CardContent className="relative px-6 pt-0 pb-6">
                        <Avatar className="-mt-10 size-20 border-4 border-card shadow-sm">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                                {initials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">
                                    {user.name}
                                </h1>
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Mail className="size-4" />
                                    {user.email}
                                </p>
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">
                                {shortUserId}
                            </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge>
                                <ShieldCheck className="size-3" />
                                {role}
                            </Badge>
                            <Badge variant="secondary">
                                <UserRound className="size-3" />
                                {jobTitle}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Theme Preference</CardTitle>
                        <CardDescription>
                            Choose how the CRM appears on this device.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AppearanceTabs className="w-full" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Edit profile</CardTitle>
                        <CardDescription>
                            Update the name and email address used for your
                            account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            {...ProfileController.update.form()}
                            options={{ preserveScroll: true }}
                            className="space-y-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">
                                                Full name
                                            </Label>
                                            <Input
                                                id="name"
                                                defaultValue={user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Email address
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                defaultValue={user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>
                                    </div>
                                    {mustVerifyEmail &&
                                        user.email_verified_at === null && (
                                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="font-medium underline underline-offset-4"
                                                >
                                                    Resend verification email
                                                </Link>
                                                {status ===
                                                    'verification-link-sent' &&
                                                    ' A new verification link has been sent.'}
                                            </div>
                                        )}
                                    <Separator />
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        <Pencil className="size-4" />
                                        Save changes
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = { breadcrumbs: [{ title: 'Profile settings', href: edit() }] };
