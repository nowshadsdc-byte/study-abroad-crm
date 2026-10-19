<?php

namespace App\Http\Requests;

use App\Services\ReportService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('report.view') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'period' => ['nullable', Rule::in(array_keys(ReportService::PERIODS))],
        ];
    }

    public function period(): string
    {
        return $this->validated('period') ?? 'year_to_date';
    }
}
