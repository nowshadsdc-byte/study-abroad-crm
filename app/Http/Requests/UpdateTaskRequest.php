<?php

namespace App\Http\Requests;

use App\Concerns\TaskValidationRules;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->can('update', $this->route('task')) && $this->canLinkStudent($this, $user);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|Closure|array<mixed>|string>>
     */
    public function rules(): array
    {
        return $this->taskRules(isUpdate: true);
    }
}
