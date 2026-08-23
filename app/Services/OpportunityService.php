<?php

namespace App\Services;

use App\Models\Opportunity;
use Illuminate\Support\Facades\DB;

class OpportunityService
{
    public function create(array $attributes): Opportunity
    {
        return DB::transaction(fn (): Opportunity => Opportunity::create($attributes));
    }

    public function update(Opportunity $opportunity, array $attributes): Opportunity
    {
        return DB::transaction(function () use ($opportunity, $attributes): Opportunity {
            $opportunity->update($attributes);

            return $opportunity->fresh();
        });
    }

    public function delete(Opportunity $opportunity): void
    {
        DB::transaction(fn () => $opportunity->delete());
    }
}
