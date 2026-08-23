<?php

namespace App\Http\Requests;

use App\Models\University;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUniversityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', University::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'max:255', Rule::unique(University::class, 'name')],
            'country' => ['bail', 'required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'ranking' => ['nullable', 'integer', 'min:1'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'programs' => ['nullable', 'array'],
            'programs.*' => ['string', 'max:255'],
            'is_active' => ['bail', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $programs = $this->input('programs');

        if (is_string($programs)) {
            $this->merge([
                'programs' => collect(explode(',', $programs))->map(fn (string $program) => trim($program))->filter()->values()->all(),
            ]);
        }

        $this->merge(['is_active' => $this->boolean('is_active', true)]);
    }
}
