<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadFollowUpRequest extends FormRequest
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
            'type' => ['required', 'in:Call,Email,Meeting,WhatsApp,Visit'], 'notes' => ['required', 'string', 'max:5000'],
            'outcome' => ['nullable', 'in:Interested,Not Interested,Callback,Converted,No Response'], 'follow_up_date' => ['nullable', 'date'],
            'next_follow_up_date' => ['nullable', 'date', 'after:follow_up_date'],
        ];
    }
}
