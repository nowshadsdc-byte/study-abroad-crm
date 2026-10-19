<?php

namespace App\Services;

class EligibilityMatcher
{
    private const EDUCATION_LEVELS = [
        'Below Secondary / SSC' => 1,
        'SSC / Secondary School Certificate' => 2,
        'HSC / Higher Secondary Certificate' => 3,
        'Diploma' => 4,
        "Bachelor's Degree" => 5,
        "Master's Degree" => 6,
        'MPhil' => 7,
        'PhD / Doctorate' => 8,
        'Professional Qualification' => null,
        'Vocational / Technical Qualification' => null,
        'Other' => null,
    ];

    /**
     * @param  array<string, mixed>  $criteria
     * @param  array{ielts_score: int|float|null, gpa: int|float|null, study_gap_years: int|null}  $credentials
     * @return array{status: 'Eligible'|'Not Eligible'|'Needs Review', checks: array<int, array{label: string, status: 'Met'|'Not Met'|'Needs Review', detail: string}>}
     */
    public function evaluate(array $criteria, ?string $requirements, array $credentials, ?string $educationLevel): array
    {
        $checks = [];
        $hasConfiguredCriteria = false;

        foreach ([
            'minimum_ielts_band' => ['IELTS / English score', 'ielts_score', 'minimum'],
            'minimum_gpa' => ['Bachelor CGPA', 'gpa', 'minimum'],
            'maximum_study_gap_years' => ['Study gap', 'study_gap_years', 'maximum'],
        ] as $criterion => [$label, $credential, $direction]) {
            $threshold = $criteria[$criterion] ?? null;

            if (! is_numeric($threshold)) {
                continue;
            }

            $hasConfiguredCriteria = true;
            $value = $credentials[$credential] ?? null;

            if (! is_numeric($value)) {
                $checks[] = [
                    'label' => $label,
                    'status' => 'Needs Review',
                    'detail' => 'A student value is required to compare this criterion.',
                ];

                continue;
            }

            $met = $direction === 'minimum'
                ? (float) $value >= (float) $threshold
                : (float) $value <= (float) $threshold;

            $checks[] = [
                'label' => $label,
                'status' => $met ? 'Met' : 'Not Met',
                'detail' => $direction === 'minimum'
                    ? "Requires at least {$threshold}; provided {$value}."
                    : "Allows up to {$threshold} years; provided {$value}.",
            ];
        }

        $minimumEducationLevel = $criteria['minimum_education_level'] ?? null;

        if (is_string($minimumEducationLevel) && $minimumEducationLevel !== '') {
            $hasConfiguredCriteria = true;
            $minimumRank = self::EDUCATION_LEVELS[$minimumEducationLevel] ?? null;
            $studentRank = $educationLevel !== null
                ? (self::EDUCATION_LEVELS[$educationLevel] ?? null)
                : null;

            if ($minimumRank === null || $studentRank === null) {
                $checks[] = [
                    'label' => 'Academic level',
                    'status' => 'Needs Review',
                    'detail' => 'The qualification level is missing or cannot be compared automatically.',
                ];
            } else {
                $met = $studentRank >= $minimumRank;
                $checks[] = [
                    'label' => 'Academic level',
                    'status' => $met ? 'Met' : 'Not Met',
                    'detail' => "Requires {$minimumEducationLevel}; profile lists {$educationLevel}.",
                ];
            }
        }

        foreach ([
            'required_subjects' => 'Subject prerequisites need manual review because prior subjects are not stored on student profiles.',
            'minimum_work_experience_years' => 'Work experience needs manual review because experience is not stored on student profiles.',
            'accepted_qualification_countries' => 'Qualification-country equivalency needs manual review because qualification country is not stored on student profiles.',
        ] as $criterion => $detail) {
            if (! empty($criteria[$criterion])) {
                $hasConfiguredCriteria = true;
                $checks[] = [
                    'label' => 'Additional requirement',
                    'status' => 'Needs Review',
                    'detail' => $detail,
                ];
            }
        }

        if (is_string($requirements) && trim($requirements) !== '') {
            $checks[] = [
                'label' => 'Additional programme requirements',
                'status' => 'Needs Review',
                'detail' => 'Free-text requirements are not machine-evaluated and must be reviewed manually.',
            ];
        }

        if (! $hasConfiguredCriteria && (! is_string($requirements) || trim($requirements) === '')) {
            $checks[] = [
                'label' => 'Programme criteria',
                'status' => 'Needs Review',
                'detail' => 'No structured eligibility criteria are configured for this programme.',
            ];
        }

        $status = collect($checks)->contains('status', 'Not Met')
            ? 'Not Eligible'
            : (collect($checks)->contains('status', 'Needs Review') ? 'Needs Review' : 'Eligible');

        return [
            'status' => $status,
            'checks' => $checks,
        ];
    }
}
