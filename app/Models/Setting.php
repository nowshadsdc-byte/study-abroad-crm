<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting by key.
     */
    public static function get($key, $default = null)
    {
        $settings = self::getAllSettings();

        return $settings[$key] ?? $default;
    }

    /**
     * Retrieve all settings.
     */
    public static function getAllSettings()
    {
        return Cache::rememberForever('global_settings', function () {
            try {
                return self::pluck('value', 'key')->toArray();
            } catch (\Exception $e) {
                return [];
            }
        });
    }

    /**
     * Boot the model.
     */
    protected static function booted()
    {
        static::saved(function () {
            Cache::forget('global_settings');
        });

        static::deleted(function () {
            Cache::forget('global_settings');
        });
    }
}
