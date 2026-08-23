<?php

namespace App;

class BangladeshPhoneNormalizer
{
    public const PATTERN = '/^\+8801[3-9]\d{8}$/';

    public static function normalize(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $normalized = preg_replace('/[\s\-()]/', '', trim($phone));

        if (preg_match('/^01[3-9]\d{8}$/', $normalized)) {
            return '+88'.$normalized;
        }

        if (preg_match('/^8801[3-9]\d{8}$/', $normalized)) {
            return '+'.$normalized;
        }

        return $normalized;
    }

    /**
     * Normalize a phone number for bulk CSV import: bare 10-digit mobile
     * numbers missing the leading 0 (e.g. "1712345678") are prefixed
     * with 0 before being run through the standard normalizer.
     */
    public static function normalizeBulkImport(?string $phone): ?string
    {
        if ($phone !== null && preg_match('/^1[3-9]\d{8}$/', trim($phone))) {
            $phone = '0'.trim($phone);
        }

        return self::normalize($phone);
    }
}
