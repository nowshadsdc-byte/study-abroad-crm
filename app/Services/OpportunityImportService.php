<?php

namespace App\Services;

use App\Models\Opportunity;
use App\Models\University;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OpportunityImportService
{
    public const COLUMNS = ['university', 'title', 'program', 'level', 'intake', 'deadline', 'tuition_fee', 'currency', 'scholarship', 'requirements', 'status'];

    private const MAX_ROWS = 2000;

    public function template(): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, self::COLUMNS);
        fputcsv($handle, [
            'University of Toronto', 'Bachelor of Computer Science', 'Computer Science', 'Bachelor', 'Fall 2026',
            '2026-06-30', '25000', 'USD', '50% tuition waiver for GPA 3.5+', 'IELTS 6.5+; Bachelor degree with 3.0 GPA', 'Open',
        ]);
        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return $contents;
    }

    /**
     * @return array{total: int, imported: int, duplicates: int, failed: int, duplicate_rows: array<int, array<string, mixed>>, failed_rows: array<int, array<string, mixed>>}
     */
    public function import(UploadedFile $file, OpportunityService $opportunityService): array
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
        $missing = array_diff(['university', 'title'], $columns);
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
        $seenPrograms = [];

        foreach ($rows as $rowNumber => $cells) {
            $row = $this->mapRow($columns, $cells);
            $summary['total']++;

            $universityName = $row['university'] ?? null;
            $university = $universityName !== null
                ? University::query()->whereRaw('LOWER(name) = ?', [mb_strtolower($universityName)])->first()
                : null;

            $row['currency'] = $row['currency'] !== null ? mb_strtoupper($row['currency']) : 'USD';
            $row['status'] ??= 'Open';

            $validator = Validator::make($row, $this->rules());
            $errors = $validator->fails() ? $validator->errors()->all() : [];
            if ($universityName === null) {
                $errors[] = 'The university field is required.';
            } elseif ($university === null) {
                $errors[] = "University not found: {$universityName}";
            }

            if ($errors !== []) {
                $summary['failed']++;
                $summary['failed_rows'][] = [
                    'row' => $rowNumber,
                    'university' => $universityName,
                    'title' => $row['title'] ?? null,
                    'errors' => $errors,
                ];

                continue;
            }

            $duplicateReason = $this->duplicateReason($university->id, $row['title'], $seenPrograms);
            if ($duplicateReason !== null) {
                $summary['duplicates']++;
                $summary['duplicate_rows'][] = [
                    'row' => $rowNumber,
                    'university' => $universityName,
                    'title' => $row['title'] ?? null,
                    'reason' => $duplicateReason,
                ];

                continue;
            }

            unset($row['university']);
            $opportunityService->create([...$row, 'university_id' => $university->id]);
            $summary['imported']++;
            $seenPrograms[$university->id.'|'.mb_strtolower(trim($row['title']))] = $rowNumber;
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

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'title' => ['bail', 'required', 'string', 'max:255'],
            'program' => ['nullable', 'string', 'max:255'],
            'level' => ['bail', 'nullable', Rule::in(['Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD'])],
            'intake' => ['nullable', 'string', 'max:255'],
            'deadline' => ['nullable', 'date'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'scholarship' => ['nullable', 'string', 'max:1000'],
            'requirements' => ['nullable', 'string', 'max:5000'],
            'status' => ['bail', 'nullable', Rule::in(['Open', 'Limited', 'Closed'])],
        ];
    }

    /**
     * @param  array<string, int>  $seenPrograms
     */
    private function duplicateReason(int $universityId, ?string $title, array &$seenPrograms): ?string
    {
        if ($title === null) {
            return null;
        }

        $key = $universityId.'|'.mb_strtolower(trim($title));

        if (isset($seenPrograms[$key])) {
            return "Duplicate program in file (row {$seenPrograms[$key]})";
        }

        if (Opportunity::query()->where('university_id', $universityId)->whereRaw('LOWER(title) = ?', [mb_strtolower(trim($title))])->exists()) {
            return 'Program already exists for this university';
        }

        return null;
    }
}
