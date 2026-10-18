<?php

namespace App\Http\Requests;

use App\Concerns\TaskValidationRules;
use App\Models\Task;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->can('create', Task::class) && $this->canLinkStudent($this, $user);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|Closure|array<mixed>|string>>
     */
    public function rules(): array
    {
        return $this->taskRules();
    }
}
