<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Used for both adding a note and editing one (when the route has a {note}).
 */
class StoreTaskNoteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $note = $this->route('note');

        if ($user === null) {
            return false;
        }

        return $note === null
            ? $user->can('addNote', $this->route('task'))
            : $user->can('manageNote', [$this->route('task'), $note]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
        ];
    }
}
