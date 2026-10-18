<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Google Fonts: Fraunces · Plus Jakarta Sans · JetBrains Mono · Hind Siliguri --}}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Hind+Siliguri:wght@400;500;600&display=swap">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #F8FAFC;
            }

            html.dark {
                background-color: #0B0F17;
            }
        </style>

        @if(\App\Models\Setting::get('site_favicon'))
            <link rel="icon" href="{{ Storage::url(\App\Models\Setting::get('site_favicon')) }}">
        @else
            <link rel="icon" href="/favicon.ico" sizes="any">
        @endif
        
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        
        @if(\App\Models\Setting::get('site_icon'))
            <link rel="apple-touch-icon" href="{{ Storage::url(\App\Models\Setting::get('site_icon')) }}">
        @else
            <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        @endif

        <meta name="description" content="{{ \App\Models\Setting::get('meta_description', '') }}">
        <meta name="keywords" content="{{ \App\Models\Setting::get('meta_keywords', '') }}">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ \App\Models\Setting::get('site_title', config('app.name', 'Laravel')) }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
