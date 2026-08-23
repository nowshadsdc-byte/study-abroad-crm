<?php

namespace App\Http\Requests;

use App\BangladeshPhoneNormalizer;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Lead::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:2', 'max:255'],
            'email' => ['bail', 'nullable', 'email:rfc', 'max:255', Rule::unique(Lead::class, 'email')],
            'phone' => ['bail', 'nullable', 'string', 'regex:'.BangladeshPhoneNormalizer::PATTERN, Rule::unique(Lead::class, 'phone')],
            'address' => ['nullable', 'string', 'max:500'],
            'source' => ['bail', 'required', Rule::in(['Facebook', 'Website', 'Referral', 'Walk-in', 'Phone', 'Instagram', 'YouTube', 'Other'])],
            'interest_country' => ['nullable', 'string', 'max:255'],
            'interest_course' => ['nullable', 'string', 'max:255'],
            'interest_intake' => ['nullable', 'string', 'max:255'],
            'status' => ['bail', 'required', Rule::in(['New', 'Contacted', 'Qualified', 'Converted', 'Lost'])],
            'priority' => ['bail', 'required', Rule::in(['Low', 'Medium', 'High'])],
            'budget' => ['nullable', Rule::in(['Low', 'Medium', 'High'])],
            'notes' => ['nullable', 'string', 'max:5000'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->filled('email') ? mb_strtolower(trim((string) $this->input('email'))) : null,
            'phone' => BangladeshPhoneNormalizer::normalize($this->input('phone')),
        ]);
    }
}
