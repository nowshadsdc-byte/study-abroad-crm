import { Head, useForm, usePage } from '@inertiajs/react';
import { Building2, Save } from 'lucide-react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SettingsLayout from '@/layouts/settings/layout';
import type { PageProps } from '@/types';

export default function CompanySetup() {
    const { settings } = usePage<PageProps>().props;

    const { data, setData, post, processing, errors } = useForm({
        // Company Information
        site_name: settings?.site_name ?? '',
        site_title: settings?.site_title ?? '',
        site_description: settings?.site_description ?? '',
        site_keywords: settings?.site_keywords ?? '',
        site_author: settings?.site_author ?? '',
        site_url: settings?.site_url ?? '',
        contact_email: settings?.contact_email ?? '',
        contact_phone: settings?.contact_phone ?? '',
        address: settings?.address ?? '',

        // Branding (Files)
        site_logo: null as File | null,
        site_icon: null as File | null,
        site_favicon: null as File | null,
        site_cover_image: null as File | null,

        // Social Media
        facebook_url: settings?.facebook_url ?? '',
        twitter_url: settings?.twitter_url ?? '',
        linkedin_url: settings?.linkedin_url ?? '',
        instagram_url: settings?.instagram_url ?? '',

        // SEO
        meta_title: settings?.meta_title ?? '',
        meta_description: settings?.meta_description ?? '',
        meta_keywords: settings?.meta_keywords ?? '',
        google_analytics_id: settings?.google_analytics_id ?? '',

        // System Settings
        maintenance_mode: settings?.maintenance_mode ?? 'off',
        timezone: settings?.timezone ?? 'UTC+06:00',
        date_format: settings?.date_format ?? 'Y-m-d',
        time_format: settings?.time_format ?? 'H:i',
        default_language: settings?.default_language ?? 'en',
        currency: settings?.currency ?? 'BDT',
        currency_symbol: settings?.currency_symbol ?? '৳',
        currency_position: settings?.currency_position ?? 'right',
        decimal_separator: settings?.decimal_separator ?? '.',
        thousand_separator: settings?.thousand_separator ?? ',',
        number_of_decimals: settings?.number_of_decimals ?? '2',
        enable_registration: settings?.enable_registration ?? 'true',
        default_user_role: settings?.default_user_role ?? 'student',

        // SMTP
        SMTP: settings?.SMTP ?? 'off',
        SMTP_HOST: settings?.SMTP_HOST ?? '',
        SMTP_PORT: settings?.SMTP_PORT ?? '',
        SMTP_USERNAME: settings?.SMTP_USERNAME ?? '',
        SMTP_PASSWORD: settings?.SMTP_PASSWORD ?? '',
        SMTP_ENCRYPTION: settings?.SMTP_ENCRYPTION ?? 'tls',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/settings/company', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () =>
                toast.success('Company settings updated successfully.'),
            onError: () =>
                toast.error('There was an error updating the settings.'),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Head title="Company Setup" />

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-xl font-semibold">Company Setup</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage global application settings and branding.
                    </p>
                </div>
                <Button disabled={processing} type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="flex h-auto flex-wrap gap-2 p-1">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="social">Social</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="smtp">SMTP</TabsTrigger>
                </TabsList>

                {/* GENERAL */}
                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>
                                Update your site name, URL, and contact details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="site_name">Site Name</Label>
                                    <Input
                                        id="site_name"
                                        value={data.site_name}
                                        onChange={(e) =>
                                            setData('site_name', e.target.value)
                                        }
                                    />
                                    {errors.site_name && (
                                        <p className="text-sm text-destructive">
                                            {errors.site_name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_title">
                                        Site Title
                                    </Label>
                                    <Input
                                        id="site_title"
                                        value={data.site_title}
                                        onChange={(e) =>
                                            setData(
                                                'site_title',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="site_description">
                                        Site Description
                                    </Label>
                                    <Textarea
                                        id="site_description"
                                        value={data.site_description}
                                        onChange={(e) =>
                                            setData(
                                                'site_description',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_url">Site URL</Label>
                                    <Input
                                        id="site_url"
                                        value={data.site_url}
                                        onChange={(e) =>
                                            setData('site_url', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_author">
                                        Site Author
                                    </Label>
                                    <Input
                                        id="site_author"
                                        value={data.site_author}
                                        onChange={(e) =>
                                            setData(
                                                'site_author',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">
                                        Contact Email
                                    </Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={data.contact_email}
                                        onChange={(e) =>
                                            setData(
                                                'contact_email',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_phone">
                                        Contact Phone
                                    </Label>
                                    <Input
                                        id="contact_phone"
                                        value={data.contact_phone}
                                        onChange={(e) =>
                                            setData(
                                                'contact_phone',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">
                                        Physical Address
                                    </Label>
                                    <Textarea
                                        id="address"
                                        value={data.address}
                                        onChange={(e) =>
                                            setData('address', e.target.value)
                                        }
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BRANDING */}
                <TabsContent value="branding" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding & Imagery</CardTitle>
                            <CardDescription>
                                Upload your logos and favicons.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="site_logo">Site Logo</Label>
                                    {(data.site_logo || settings?.site_logo) && (
                                        <div className="mb-2 inline-block rounded bg-muted p-2">
                                            <img
                                                src={data.site_logo instanceof File ? URL.createObjectURL(data.site_logo) : `/storage/${settings.site_logo}`}
                                                alt="Site Logo"
                                                className="h-16 object-contain"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        id="site_logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setData(
                                                'site_logo',
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                    />
                                    {errors.site_logo && (
                                        <p className="text-sm text-destructive">
                                            {errors.site_logo}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_favicon">
                                        Favicon
                                    </Label>
                                    {settings?.site_favicon && (
                                        <div className="mb-2 inline-block rounded bg-muted p-2">
                                            <img
                                                src={`/storage/${settings.site_favicon}`}
                                                alt="Site Favicon"
                                                className="h-8 object-contain"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        id="site_favicon"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setData(
                                                'site_favicon',
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_icon">
                                        Site Icon (Square)
                                    </Label>
                                    {settings?.site_icon && (
                                        <div className="mb-2 inline-block rounded bg-muted p-2">
                                            <img
                                                src={`/storage/${settings.site_icon}`}
                                                alt="Site Icon"
                                                className="h-12 object-contain"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        id="site_icon"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setData(
                                                'site_icon',
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="site_cover_image">
                                        Cover Image
                                    </Label>
                                    {settings?.site_cover_image && (
                                        <div className="mb-2">
                                            <img
                                                src={`/storage/${settings.site_cover_image}`}
                                                alt="Cover"
                                                className="h-32 w-full rounded-md object-cover"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        id="site_cover_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setData(
                                                'site_cover_image',
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SOCIAL MEDIA */}
                <TabsContent value="social" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Social Media Links</CardTitle>
                            <CardDescription>
                                URLs to your social media profiles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="facebook_url">
                                        Facebook URL
                                    </Label>
                                    <Input
                                        id="facebook_url"
                                        type="url"
                                        value={data.facebook_url}
                                        onChange={(e) =>
                                            setData(
                                                'facebook_url',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitter_url">
                                        Twitter URL
                                    </Label>
                                    <Input
                                        id="twitter_url"
                                        type="url"
                                        value={data.twitter_url}
                                        onChange={(e) =>
                                            setData(
                                                'twitter_url',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="linkedin_url">
                                        LinkedIn URL
                                    </Label>
                                    <Input
                                        id="linkedin_url"
                                        type="url"
                                        value={data.linkedin_url}
                                        onChange={(e) =>
                                            setData(
                                                'linkedin_url',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagram_url">
                                        Instagram URL
                                    </Label>
                                    <Input
                                        id="instagram_url"
                                        type="url"
                                        value={data.instagram_url}
                                        onChange={(e) =>
                                            setData(
                                                'instagram_url',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO */}
                <TabsContent value="seo" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO Optimization</CardTitle>
                            <CardDescription>
                                Configure search engine metadata.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="meta_title">Meta Title</Label>
                                <Input
                                    id="meta_title"
                                    value={data.meta_title}
                                    onChange={(e) =>
                                        setData('meta_title', e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meta_description">
                                    Meta Description
                                </Label>
                                <Textarea
                                    id="meta_description"
                                    value={data.meta_description}
                                    onChange={(e) =>
                                        setData(
                                            'meta_description',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meta_keywords">
                                    Meta Keywords
                                </Label>
                                <Input
                                    id="meta_keywords"
                                    value={data.meta_keywords}
                                    onChange={(e) =>
                                        setData('meta_keywords', e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="google_analytics_id">
                                    Google Analytics ID
                                </Label>
                                <Input
                                    id="google_analytics_id"
                                    value={data.google_analytics_id}
                                    onChange={(e) =>
                                        setData(
                                            'google_analytics_id',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="G-XXXXXXXXXX"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SYSTEM SETTINGS */}
                <TabsContent value="system" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Preferences</CardTitle>
                            <CardDescription>
                                Configure core application behavior.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">
                                        Base Currency
                                    </Label>
                                    <Input
                                        id="currency"
                                        value={data.currency}
                                        onChange={(e) =>
                                            setData('currency', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency_symbol">
                                        Currency Symbol
                                    </Label>
                                    <Input
                                        id="currency_symbol"
                                        value={data.currency_symbol}
                                        onChange={(e) =>
                                            setData(
                                                'currency_symbol',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency_position">
                                        Currency Position
                                    </Label>
                                    <Input
                                        id="currency_position"
                                        value={data.currency_position}
                                        onChange={(e) =>
                                            setData(
                                                'currency_position',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="left or right"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Input
                                        id="timezone"
                                        value={data.timezone}
                                        onChange={(e) =>
                                            setData('timezone', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_format">
                                        Date Format
                                    </Label>
                                    <Input
                                        id="date_format"
                                        value={data.date_format}
                                        onChange={(e) =>
                                            setData(
                                                'date_format',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time_format">
                                        Time Format
                                    </Label>
                                    <Input
                                        id="time_format"
                                        value={data.time_format}
                                        onChange={(e) =>
                                            setData(
                                                'time_format',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SMTP SETTINGS */}
                <TabsContent value="smtp" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Email Configuration</CardTitle>
                            <CardDescription>
                                Configure outgoing email server.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="SMTP_HOST">SMTP Host</Label>
                                    <Input
                                        id="SMTP_HOST"
                                        value={data.SMTP_HOST}
                                        onChange={(e) =>
                                            setData('SMTP_HOST', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="SMTP_PORT">SMTP Port</Label>
                                    <Input
                                        id="SMTP_PORT"
                                        value={data.SMTP_PORT}
                                        onChange={(e) =>
                                            setData('SMTP_PORT', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="SMTP_USERNAME">
                                        SMTP Username
                                    </Label>
                                    <Input
                                        id="SMTP_USERNAME"
                                        value={data.SMTP_USERNAME}
                                        onChange={(e) =>
                                            setData(
                                                'SMTP_USERNAME',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="SMTP_PASSWORD">
                                        SMTP Password
                                    </Label>
                                    <Input
                                        id="SMTP_PASSWORD"
                                        type="password"
                                        value={data.SMTP_PASSWORD}
                                        onChange={(e) =>
                                            setData(
                                                'SMTP_PASSWORD',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="SMTP_ENCRYPTION">
                                        Encryption (tls/ssl)
                                    </Label>
                                    <Input
                                        id="SMTP_ENCRYPTION"
                                        value={data.SMTP_ENCRYPTION}
                                        onChange={(e) =>
                                            setData(
                                                'SMTP_ENCRYPTION',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </form>
    );
}

CompanySetup.layout = (page: React.ReactNode) => (
    <SettingsLayout>{page}</SettingsLayout>
);
