import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name, settings } = usePage<any>().props;

    const siteName = settings?.site_name || name;

    if (settings?.site_logo) {
        return (
            <div className="flex items-center justify-start overflow-hidden">
                <img src={`/storage/${settings.site_logo}`} alt={siteName} className="h-8 max-w-full object-contain" />
            </div>
        );
    }

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                {settings?.site_icon ? (
                    <img src={`/storage/${settings.site_icon}`} alt={siteName} className="w-full h-full object-cover" />
                ) : (
                    <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {siteName}
                </span>
            </div>
        </>
    );
}
