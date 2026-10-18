<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreChatMessageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('chat.send') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'recipient_id' => ['required', 'integer', 'different:'.$this->user()->id, 'exists:users,id'],
            'body' => ['nullable', 'string', 'max:10000', 'required_without:attachment'],
            'attachment' => ['nullable', File::types(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'])->max(10240), 'required_without:body'],
        ];
    }
}
