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
