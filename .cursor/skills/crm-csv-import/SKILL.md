---
name: crm-csv-import
description: "Use when adding or changing bulk CSV import for a Confidence Global Bd CRM module (leads, candidates, opportunities, universities, or a new module), including the downloadable CSV template, row validation, duplicate detection, phone normalization, the import summary response, and the bulk-import dialog in React. Triggers: 'bulk import', 'CSV upload', 'import template', 'add column to import', 'duplicates in import'."
metadata:
  author: confidenceglobalbd
---

# CRM CSV Import

Four modules already implement the same import pattern. Copy the closest one rather than designing a new flow.

| Module | Service | Controller | Dialog | Test |
| --- | --- | --- | --- | --- |
| Leads | `app/Services/LeadImportService.php` | `Api/LeadImportController.php` | `pages/leads/bulk-lead-import.tsx` | `tests/Feature/LeadImportTest.php` |
| Candidates | `CandidateImportService.php` | `Api/CandidateImportController.php` | `pages/candidates/bulk-candidate-import.tsx` | `CandidateImportTest.php` |
| Opportunities | `OpportunityImportService.php` | `Api/OpportunityImportController.php` | `pages/opportunities/bulk-opportunity-import.tsx` | `OpportunityImportTest.php` |
| Universities | `UniversityImportService.php` | `Api/UniversityImportController.php` | `pages/universities/bulk-university-import.tsx` | `UniversityImportTest.php` |

## Service Contract

- `public const COLUMNS = [...]` — the canonical header order. The template and the column mapper both read from it.
- `private const MAX_ROWS = 2000` — abort `422` above this.
- `template(): string` — writes `COLUMNS` plus one realistic Bangladeshi example row with `fputcsv` to `php://temp`.
- `import(UploadedFile $file, User $actor, XService $service): array` returning exactly:
  `array{total: int, imported: int, duplicates: int, failed: int, duplicate_rows: array<int, array<string, mixed>>, failed_rows: array<int, array<string, mixed>>}`
- Processing rules:
  - Header names are lower-cased and trimmed; missing **required** columns abort `422` with `'The CSV is missing required column(s): ...'`.
  - Empty lines (`[null]`) are skipped. Row numbers are the spreadsheet row (header = row 1).
  - Blank cells become `null`; apply defaults with `??=` (e.g. `source` → `Website`, `status` → `New`).
  - Normalize before validating: emails lower-cased, phones via `BangladeshPhoneNormalizer::normalizeBulkImport()`.
  - Validate each row with `Validator::make($row, $this->rules())`; failures go to `failed_rows` with `row`, identifying fields, and `errors`.
  - Duplicates are checked against the database **and** earlier rows in the same file (`$seenEmails`, `$seenPhones`); they go to `duplicate_rows` with a human-readable `reason`.
  - Valid rows are created through the module's normal service (`$leadService->create($row, $actor)`) so activities and events still fire. Never insert directly.

## Controller Contract

- `template()` → `Gate::authorize('create', Model::class)` then `response()->streamDownload(..., '<model>_template.csv', ['Content-Type' => 'text/csv'])`.
- `import()` → authorize `create`, validate `['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]`, return the summary as JSON.
- Routes (`routes/api.php`), declared **before** `/{model}` routes, both guarded by `permission:<module>.create`:
  - `GET <plural>/import/template` → `api.<plural>.import.template`
  - `POST <plural>/import` → `api.<plural>.import.store`

## Adding a Column

1. Migration + model `$fillable` (if it is a new field).
2. Append to `COLUMNS` and the example row in `template()`.
3. Add its rule to `rules()` and any normalization to the row loop.
4. Update the template header assertion in the module's import test.
5. Update the column help text in the bulk-import dialog.

## Tests

Mirror `LeadImportTest.php`: build files with `UploadedFile::fake()->createWithContent('x.csv', $csv)` and cover template header, successful import, missing required column (`422`), in-file and database duplicates, invalid rows in `failed_rows`, and a user without `<module>.create` getting `403`. Run `php artisan test --compact --filter=<Model>ImportTest`.
