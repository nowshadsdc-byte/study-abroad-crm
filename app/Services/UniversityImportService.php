<?php

namespace App\Services;

use App\Models\University;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

class UniversityImportService
{
    public const COLUMNS = ['name', 'country', 'city', 'website', 'ranking', 'logo_url', 'description', 'programs'];

    private const MAX_ROWS = 2000;

    public function template(): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, self::COLUMNS);
        fputcsv($handle, [
            'University of Toronto', 'Canada', 'Toronto', 'https://www.utoronto.ca', '20', '',
            'A leading Canadian research university.', 'Computer Science, Business, Engineering',
        ]);
        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return $contents;
    }

    /**
     * @return array{total: int, imported: int, duplicates: int, failed: int, duplicate_rows: array<int, array<string, mixed>>, failed_rows: array<int, array<string, mixed>>}
     */
    public function import(UploadedFile $file, UniversityService $universityService): array
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
        $missing = array_diff(['name'], $columns);
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
        $seenNames = [];

        foreach ($rows as $rowNumber => $cells) {
            $row = $this->mapRow($columns, $cells);
            $summary['total']++;

            $row['programs'] = $row['programs'] !== null
                ? collect(explode(',', $row['programs']))->map(fn (string $program) => trim($program))->filter()->values()->all()
                : [];

            $validator = Validator::make($row, $this->rules());
            if ($validator->fails()) {
                $summary['failed']++;
                $summary['failed_rows'][] = [
                    'row' => $rowNumber,
                    'name' => $row['name'] ?? null,
                    'errors' => $validator->errors()->all(),
                ];

                continue;
            }

            $duplicateReason = $this->duplicateReason($row['name'], $seenNames);
            if ($duplicateReason !== null) {
                $summary['duplicates']++;
                $summary['duplicate_rows'][] = [
                    'row' => $rowNumber,
                    'name' => $row['name'] ?? null,
                    'reason' => $duplicateReason,
                ];

                continue;
            }

            $universityService->create($row);
            $summary['imported']++;
            $seenNames[mb_strtolower(trim($row['name']))] = $rowNumber;
        }

        return $summary;
    }

    /**
     * @param  array<int, string>  $columns
     * @param  array<int, string|null>  $cells
     * @return array<string, mixed>
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

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'max:255'],
            'country' => ['bail', 'required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'ranking' => ['nullable', 'integer', 'min:1'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'programs' => ['nullable', 'array'],
            'programs.*' => ['string', 'max:255'],
        ];
    }

    /**
     * @param  array<string, int>  $seenNames
     */
    private function duplicateReason(?string $name, array &$seenNames): ?string
    {
        if ($name === null) {
            return null;
        }

        $key = mb_strtolower(trim($name));

        if (isset($seenNames[$key])) {
            return "Duplicate university name in file (row {$seenNames[$key]})";
        }

        if (University::query()->whereRaw('LOWER(name) = ?', [$key])->exists()) {
            return 'University name already exists';
        }

        return null;
    }
}
