<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EvaluateEligibilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('opportunity.view') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'student_type' => ['required', Rule::in(['lead', 'candidate'])],
            'student_id' => [
                'required',
                'integer',
                Rule::when(
                    $this->input('student_type') === 'lead',
                    ['exists:leads,id'],
                    ['exists:candidates,id'],
                ),
            ],
            'ielts_score' => ['nullable', 'numeric', 'min:0', 'max:9'],
            'gpa' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'study_gap_years' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'education_level' => ['nullable', Rule::in([
                'Below Secondary / SSC',
                'SSC / Secondary School Certificate',
                'HSC / Higher Secondary Certificate',
                'Diploma',
                "Bachelor's Degree",
                "Master's Degree",
                'MPhil',
                'PhD / Doctorate',
                'Professional Qualification',
                'Vocational / Technical Qualification',
                'Other',
            ])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
