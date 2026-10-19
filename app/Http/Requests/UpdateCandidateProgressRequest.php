<?php

namespace App\Http\Requests;

use App\Models\CandidateProgress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCandidateProgressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('updateProgress', $this->route('candidate')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'in:Pending,In Progress,Completed,Skipped'],
            'outcome' => ['nullable', Rule::in(CandidateProgress::VISA_OUTCOMES), Rule::prohibitedIf(fn (): bool => $this->route('progress')?->step !== 'Visa')],
            'notes' => ['nullable', 'string', 'max:5000'],
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
        ];
    }
}
