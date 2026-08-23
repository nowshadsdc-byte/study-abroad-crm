<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidateDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [...CandidateResource::make($this)->resolve(), 'date_of_birth' => $this->date_of_birth, 'gender' => $this->gender, 'address' => $this->address, 'education_level' => $this->education_level, 'institution' => $this->institution, 'gpa' => $this->gpa, 'passing_year' => $this->passing_year, 'ielts_score' => $this->ielts_score, 'notes' => $this->notes, 'lead' => $this->whenLoaded('lead', fn () => ['id' => $this->lead?->id, 'source' => $this->lead?->source, 'notes' => $this->lead?->notes]), 'documents' => CandidateDocumentResource::collection($this->whenLoaded('documents')), 'progress' => CandidateProgressResource::collection($this->whenLoaded('progressRecords')), 'applications' => CandidateApplicationResource::collection($this->whenLoaded('applications')), 'invoices' => $this->whenLoaded('invoices', fn () => $this->invoices->map(fn ($invoice) => ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'total' => $invoice->total, 'balance_due' => $invoice->balance_due, 'status' => $invoice->status, 'issue_date' => $invoice->issue_date]))];
    }
}
