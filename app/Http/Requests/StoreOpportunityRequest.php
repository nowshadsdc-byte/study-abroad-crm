<?php

namespace App\Http\Requests;

use App\Models\Opportunity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOpportunityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Opportunity::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'university_id' => ['bail', 'required', 'integer', 'exists:universities,id'],
            'title' => ['bail', 'required', 'string', 'max:255'],
            'program' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', Rule::in(['Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD'])],
            'intake' => ['nullable', 'string', 'max:255'],
            'deadline' => ['nullable', 'date'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'scholarship' => ['nullable', 'string', 'max:1000'],
            'requirements' => ['nullable', 'string', 'max:5000'],
            'eligibility_criteria' => ['nullable', 'array'],
            'eligibility_criteria.minimum_ielts_band' => ['nullable', 'numeric', 'min:0', 'max:9'],
            'eligibility_criteria.minimum_gpa' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'eligibility_criteria.maximum_study_gap_years' => ['nullable', 'integer', 'min:0', 'max:100'],
            'eligibility_criteria.minimum_education_level' => ['nullable', Rule::in(['Below Secondary / SSC', 'SSC / Secondary School Certificate', 'HSC / Higher Secondary Certificate', 'Diploma', "Bachelor's Degree", "Master's Degree", 'MPhil', 'PhD / Doctorate', 'Professional Qualification', 'Vocational / Technical Qualification', 'Other'])],
            'eligibility_criteria.required_subjects' => ['nullable', 'array', 'max:20'],
            'eligibility_criteria.required_subjects.*' => ['required', 'string', 'max:100'],
            'eligibility_criteria.minimum_work_experience_years' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'eligibility_criteria.accepted_qualification_countries' => ['nullable', 'array', 'max:100'],
            'eligibility_criteria.accepted_qualification_countries.*' => ['required', 'string', 'max:100'],
            'status' => ['bail', 'required', Rule::in(['Open', 'Limited', 'Closed'])],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'currency' => $this->filled('currency') ? mb_strtoupper(trim((string) $this->input('currency'))) : 'USD',
        ]);
    }
}
