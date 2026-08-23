<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCandidateDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('createDocument', $this->route('candidate')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:255'], 'type' => ['required', 'in:Passport,Transcript,Certificate,IELTS,SOP,Recommendation,Photo,Bank Statement,Other'], 'file' => ['nullable', 'file', 'max:10240'], 'file_url' => ['nullable', 'url', 'max:2048'], 'status' => ['required', 'in:Pending,Verified,Rejected'], 'notes' => ['nullable', 'string', 'max:5000']];
    }
}
