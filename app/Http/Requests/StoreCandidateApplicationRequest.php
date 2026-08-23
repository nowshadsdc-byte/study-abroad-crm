<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCandidateApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('createApplication', $this->route('candidate')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return ['opportunity_id' => ['required', 'exists:opportunities,id'], 'status' => ['required', 'in:Draft,Submitted,Under Review,Accepted,Rejected,Waitlisted'], 'notes' => ['nullable', 'string', 'max:5000']];
    }
}
