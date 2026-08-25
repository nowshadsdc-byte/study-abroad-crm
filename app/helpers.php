<?php

if (! function_exists('setting')) {
    /**
     * Get a setting value by key.
     *
     * @param  string|null  $key
     * @param  mixed  $default
     * @return mixed
     */
    function setting($key = null, $default = null)
    {
        if (is_null($key)) {
            return \App\Models\Setting::getAllSettings();
        }

        return \App\Models\Setting::get($key, $default);
    }
}
