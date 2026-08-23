<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'in:Pending,In Progress,Completed,Skipped'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
        ];
    }
}
