<?php

namespace App\Http\Requests;

use App\Models\Candidate;
use Illuminate\Foundation\Http\FormRequest;

class StoreCandidateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Candidate::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return self::candidateRules();
    }

    /** @return array<string, array<int, string>> */
    public static function candidateRules(): array
    {
        return ['name' => ['required', 'string', 'max:255'], 'email' => ['nullable', 'email', 'max:255'], 'phone' => ['nullable', 'string', 'max:30'], 'date_of_birth' => ['nullable', 'date', 'before:today'], 'gender' => ['nullable', 'in:Male,Female,Other'], 'address' => ['nullable', 'string'], 'education_level' => ['nullable', 'in:Below Secondary / SSC,SSC / Secondary School Certificate,HSC / Higher Secondary Certificate,Diploma,Bachelor\'s Degree,Master\'s Degree,MPhil,PhD / Doctorate,Professional Qualification,Vocational / Technical Qualification,Other'], 'institution' => ['nullable', 'string', 'max:255'], 'gpa' => ['nullable', 'numeric', 'min:0', 'max:5'], 'passing_year' => ['nullable', 'integer', 'min:1950', 'max:'.(now()->year + 1)], 'ielts_score' => ['nullable', 'numeric', 'min:0', 'max:9'], 'desired_country' => ['nullable', 'string', 'max:255'], 'desired_course' => ['nullable', 'string', 'max:255'], 'desired_intake' => ['nullable', 'string', 'max:255'], 'current_step' => ['sometimes', 'in:Application,Documents,Submission,Offer,Visa,Enrollment'], 'status' => ['required', 'in:Active,On Hold,Completed,Withdrawn'], 'assigned_to_id' => ['nullable', 'exists:users,id'], 'lead_id' => ['nullable', 'integer', 'exists:leads,id', 'unique:candidates,lead_id'], 'notes' => ['nullable', 'string']];
    }
}
