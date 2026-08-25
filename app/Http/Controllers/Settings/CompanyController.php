<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    /**
     * Display the company settings edit form.
     */
    public function edit(Request $request): Response
    {
        if (! $request->user()->hasRole(['Super Admin', 'Administrator'])) {
            abort(403, 'Unauthorized action.');
        }

        return Inertia::render('settings/company/edit', [
            'settings' => Setting::getAllSettings(),
        ]);
    }

    /**
     * Update the company settings.
     */
    public function update(Request $request): RedirectResponse
    {
        if (! $request->user()->hasRole(['Super Admin', 'Administrator'])) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'site_name' => 'nullable|string|max:255',
            'site_title' => 'nullable|string|max:255',
            'site_description' => 'nullable|string',
            'site_keywords' => 'nullable|string|max:255',
            'site_author' => 'nullable|string|max:255',
            'site_url' => 'nullable|url|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',

            'site_logo' => 'nullable|image|max:2048',
            'site_icon' => 'nullable|image|max:1024',
            'site_favicon' => 'nullable|image|max:1024',
            'site_cover_image' => 'nullable|image|max:4096',

            'facebook_url' => 'nullable|url|max:255',
            'twitter_url' => 'nullable|url|max:255',
            'linkedin_url' => 'nullable|url|max:255',
            'instagram_url' => 'nullable|url|max:255',

            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'meta_keywords' => 'nullable|string|max:255',
            'google_analytics_id' => 'nullable|string|max:100',

            'maintenance_mode' => 'nullable|string',
            'timezone' => 'nullable|string',
            'date_format' => 'nullable|string',
            'time_format' => 'nullable|string',
            'default_language' => 'nullable|string',
            'currency' => 'nullable|string',
            'currency_symbol' => 'nullable|string',
            'currency_position' => 'nullable|string',
            'decimal_separator' => 'nullable|string',
            'thousand_separator' => 'nullable|string',
            'number_of_decimals' => 'nullable|string',
            'enable_registration' => 'nullable|string',
            'default_user_role' => 'nullable|string',

            'SMTP' => 'nullable|string',
            'SMTP_HOST' => 'nullable|string|max:255',
            'SMTP_PORT' => 'nullable|string|max:20',
            'SMTP_USERNAME' => 'nullable|string|max:255',
            'SMTP_PASSWORD' => 'nullable|string|max:255',
            'SMTP_ENCRYPTION' => 'nullable|string|max:50',
        ]);

        $imageFields = ['site_logo', 'site_icon', 'site_favicon', 'site_cover_image'];

        foreach ($validated as $key => $value) {
            if (in_array($key, $imageFields)) {
                if ($request->hasFile($key)) {
                    $oldImage = Setting::get($key);
                    if ($oldImage && Storage::disk('public')->exists($oldImage)) {
                        Storage::disk('public')->delete($oldImage);
                    }

                    $path = $request->file($key)->store('settings', 'public');
                    Setting::updateOrCreate(['key' => $key], ['value' => $path]);
                }
            } else {
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => $value ?? '']
                );
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Settings updated successfully.')]);

        return back();
    }
}
