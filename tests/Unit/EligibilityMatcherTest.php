<?php

use App\Services\EligibilityMatcher;

test('matches only when all configured supported criteria are met', function () {
    $result = (new EligibilityMatcher)->evaluate(
        [
            'minimum_ielts_band' => 6.5,
            'minimum_gpa' => 3,
            'maximum_study_gap_years' => 2,
            'minimum_education_level' => "Bachelor's Degree",
        ],
        null,
        ['ielts_score' => 7, 'gpa' => 3.5, 'study_gap_years' => 1],
        "Bachelor's Degree",
    );

    expect($result['status'])->toBe('Eligible')
        ->and($result['checks'])->toHaveCount(4)
        ->and(collect($result['checks'])->every(fn (array $check): bool => $check['status'] === 'Met'))->toBeTrue();
});

test('a failed criterion takes precedence over missing review data', function () {
    $result = (new EligibilityMatcher)->evaluate(
        ['minimum_ielts_band' => 7, 'maximum_study_gap_years' => 2],
        null,
        ['ielts_score' => 6.5, 'gpa' => null, 'study_gap_years' => null],
        null,
    );

    expect($result['status'])->toBe('Not Eligible')
        ->and($result['checks'])->toHaveCount(2);
});

test('missing credentials, free text, and unsupported criteria require manual review', function () {
    $result = (new EligibilityMatcher)->evaluate(
        [
            'minimum_ielts_band' => 6.5,
            'required_subjects' => ['Calculus'],
        ],
        'Two recommendation letters',
        ['ielts_score' => null, 'gpa' => null, 'study_gap_years' => null],
        null,
    );

    expect($result['status'])->toBe('Needs Review')
        ->and($result['checks'])->toHaveCount(3);
});

test('programmes without configured requirements are not assumed eligible', function () {
    $result = (new EligibilityMatcher)->evaluate(
        [],
        null,
        ['ielts_score' => 8, 'gpa' => 5, 'study_gap_years' => 0],
        "Bachelor's Degree",
    );

    expect($result['status'])->toBe('Needs Review');
});
