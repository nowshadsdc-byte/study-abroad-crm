<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'site_name', 'value' => 'LaraCraft'],
            ['key' => 'site_title', 'value' => 'LaraCraft - Course Management System'],
            ['key' => 'site_description', 'value' => 'A comprehensive course management system built with Laravel.'],
            ['key' => 'site_keywords', 'value' => 'Laravel, course management, education'],
            ['key' => 'site_author', 'value' => 'LaraCraft Team'],
            ['key' => 'site_logo', 'value' => null],
            ['key' => 'site_icon', 'value' => null],
            ['key' => 'site_cover_image', 'value' => null],
            ['key' => 'site_url', 'value' => 'http://localhost'],
            ['key' => 'site_favicon', 'value' => null],
            ['key' => 'contact_email', 'value' => ''],
            ['key' => 'contact_phone', 'value' => ''],
            ['key' => 'address', 'value' => ''],
            ['key' => 'facebook_url', 'value' => ''],
            ['key' => 'twitter_url', 'value' => ''],
            ['key' => 'linkedin_url', 'value' => ''],
            ['key' => 'instagram_url', 'value' => ''],
            ['key' => 'meta_title', 'value' => 'LaraCraft - Course Management System'],
            ['key' => 'meta_description', 'value' => 'A comprehensive course management system built with Laravel.'],
            ['key' => 'meta_keywords', 'value' => 'Laravel, course management, education'],
            ['key' => 'google_analytics_id', 'value' => ''],
            ['key' => 'maintenance_mode', 'value' => 'off'],
            ['key' => 'timezone', 'value' => 'UTC+06:00'],
            ['key' => 'date_format', 'value' => 'Y-m-d'],
            ['key' => 'time_format', 'value' => 'H:i'],
            ['key' => 'default_language', 'value' => 'en'],
            ['key' => 'currency', 'value' => 'BDT'],
            ['key' => 'currency_symbol', 'value' => '৳'],
            ['key' => 'currency_position', 'value' => 'right'],
            ['key' => 'decimal_separator', 'value' => '.'],
            ['key' => 'thousand_separator', 'value' => ','],
            ['key' => 'number_of_decimals', 'value' => '2'],
            ['key' => 'enable_registration', 'value' => 'true'],
            ['key' => 'default_user_role', 'value' => 'student'],
            ['key' => 'SMTP', 'value' => 'off'],
            ['key' => 'SMTP_HOST', 'value' => ''],
            ['key' => 'SMTP_PORT', 'value' => ''],
            ['key' => 'SMTP_USERNAME', 'value' => ''],
            ['key' => 'SMTP_PASSWORD', 'value' => ''],
            ['key' => 'SMTP_ENCRYPTION', 'value' => 'tls'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}
