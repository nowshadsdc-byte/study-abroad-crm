<?php

namespace App\Http\Requests;

use App\BangladeshPhoneNormalizer;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('lead')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'], 'email' => ['nullable', 'email', 'max:255'], 'phone' => ['bail', 'nullable', 'string', 'regex:'.BangladeshPhoneNormalizer::PATTERN, Rule::unique(Lead::class, 'phone')->ignore($this->route('lead'))], 'address' => ['nullable', 'string', 'max:500'],
            'source' => ['required', 'in:Facebook,Website,Referral,Walk-in,Phone,Instagram,YouTube,Other'],
            'interest_country' => ['nullable', 'string', 'max:255'], 'interest_course' => ['nullable', 'string', 'max:255'], 'interest_intake' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:New,Contacted,Qualified,Converted,Lost'], 'priority' => ['required', 'in:Low,Medium,High'],
            'budget' => ['nullable', 'in:Low,Medium,High'], 'notes' => ['nullable', 'string'], 'assigned_to_id' => ['nullable', 'exists:users,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => BangladeshPhoneNormalizer::normalize($this->input('phone')),
        ]);
    }
}
