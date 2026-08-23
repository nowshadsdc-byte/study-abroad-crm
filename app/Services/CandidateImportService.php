<?php

namespace App\Services;

use App\BangladeshPhoneNormalizer;
use App\Models\Candidate;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CandidateImportService
{
    public const COLUMNS = ['name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'education_level', 'institution', 'gpa', 'passing_year', 'ielts_score', 'desired_country', 'desired_course', 'desired_intake', 'status', 'notes'];

    private const MAX_ROWS = 2000;

    public function template(): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, self::COLUMNS);
        fputcsv($handle, [
            'Arif Hossain', 'arif@example.com', '+8801711000111', '2000-05-14', 'Male',
            'House 12, Road 3, Dhaka', "Bachelor's Degree", 'Dhaka University', '3.75', '2022',
            '7.0', 'United Kingdom', 'MSc Data Analytics', 'Fall 2026', 'Active', 'Interested in UK universities',
        ]);
        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return $contents;
    }

    /**
     * @return array{total: int, imported: int, duplicates: int, failed: int, duplicate_rows: array<int, array<string, mixed>>, failed_rows: array<int, array<string, mixed>>}
     */
    public function import(UploadedFile $file, User $actor, CandidateService $candidateService): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            abort(422, 'Unable to read the uploaded file.');
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            abort(422, 'The uploaded file is empty.');
        }

        $columns = array_map(fn (string $column) => mb_strtolower(trim($column)), $header);
        $missing = array_diff(['name', 'phone'], $columns);
        if ($missing !== []) {
            fclose($handle);
            abort(422, 'The CSV is missing required column(s): '.implode(', ', $missing));
        }

        $rows = [];
        $rowNumber = 1;
        while (($cells = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if ($cells === [null]) {
                continue;
            }
            $rows[$rowNumber] = $cells;
        }
        fclose($handle);

        if (count($rows) > self::MAX_ROWS) {
            abort(422, 'The CSV contains too many rows. The maximum supported is '.self::MAX_ROWS.'.');
        }

        $summary = ['total' => 0, 'imported' => 0, 'duplicates' => 0, 'failed' => 0, 'duplicate_rows' => [], 'failed_rows' => []];
        $seenPhones = [];

        foreach ($rows as $rowNumber => $cells) {
            $row = $this->mapRow($columns, $cells);
            $summary['total']++;

            $row['email'] = $this->normalizeEmail($row['email'] ?? null);
            $row['phone'] = BangladeshPhoneNormalizer::normalizeBulkImport($row['phone'] ?? null);
            $row['status'] ??= 'Active';

            $validator = Validator::make($row, $this->rules());
            if ($validator->fails()) {
                $summary['failed']++;
                $summary['failed_rows'][] = [
                    'row' => $rowNumber,
                    'name' => $row['name'] ?? null,
                    'email' => $row['email'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'errors' => $validator->errors()->all(),
                ];

                continue;
            }

            $duplicateReason = $this->duplicateReason($row, $seenPhones);
            if ($duplicateReason !== null) {
                $summary['duplicates']++;
                $summary['duplicate_rows'][] = [
                    'row' => $rowNumber,
                    'name' => $row['name'] ?? null,
                    'email' => $row['email'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'reason' => $duplicateReason,
                ];

                continue;
            }

            $candidateService->createCandidateWithProgress($row, $actor);
            $summary['imported']++;
            $seenPhones[$row['phone']] = $rowNumber;
        }

        return $summary;
    }

    /**
     * @param  array<int, string>  $columns
     * @param  array<int, string|null>  $cells
     * @return array<string, string|null>
     */
    private function mapRow(array $columns, array $cells): array
    {
        $row = [];
        foreach (self::COLUMNS as $column) {
            $index = array_search($column, $columns, true);
            $value = $index !== false ? ($cells[$index] ?? null) : null;
            $row[$column] = is_string($value) && trim($value) !== '' ? trim($value) : null;
        }

        return $row;
    }

    private function normalizeEmail(?string $email): ?string
    {
        return $email !== null ? mb_strtolower(trim($email)) : null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:2', 'max:255'],
            'email' => ['bail', 'nullable', 'email:rfc', 'max:255'],
            'phone' => ['bail', 'required', 'string', 'regex:'.BangladeshPhoneNormalizer::PATTERN],
            'date_of_birth' => ['bail', 'nullable', 'date', 'before:today'],
            'gender' => ['bail', 'nullable', Rule::in(['Male', 'Female', 'Other'])],
            'address' => ['nullable', 'string', 'max:500'],
            'education_level' => ['bail', 'nullable', Rule::in([
                'Below Secondary / SSC', 'SSC / Secondary School Certificate', 'HSC / Higher Secondary Certificate',
                'Diploma', "Bachelor's Degree", "Master's Degree", 'MPhil', 'PhD / Doctorate',
                'Professional Qualification', 'Vocational / Technical Qualification', 'Other',
            ])],
            'institution' => ['nullable', 'string', 'max:255'],
            'gpa' => ['bail', 'nullable', 'numeric', 'min:0', 'max:5'],
            'passing_year' => ['bail', 'nullable', 'integer', 'min:1950', 'max:'.(now()->year + 1)],
            'ielts_score' => ['bail', 'nullable', 'numeric', 'min:0', 'max:9'],
            'desired_country' => ['nullable', 'string', 'max:255'],
            'desired_course' => ['nullable', 'string', 'max:255'],
            'desired_intake' => ['nullable', 'string', 'max:255'],
            'status' => ['bail', 'nullable', Rule::in(['Active', 'On Hold', 'Completed', 'Withdrawn'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<string, int>  $seenPhones
     */
    private function duplicateReason(array $row, array &$seenPhones): ?string
    {
        $phone = $row['phone'] ?? null;

        if ($phone !== null) {
            if (isset($seenPhones[$phone])) {
                return "Duplicate phone in file (row {$seenPhones[$phone]})";
            }
            if (Candidate::query()->where('phone', $phone)->exists()) {
                return 'Phone already exists';
            }
        }

        return null;
    }
}
