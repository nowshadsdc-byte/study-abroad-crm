<?php

namespace App\Services;

use App\Models\University;
use Illuminate\Support\Facades\DB;

class UniversityService
{
    public function create(array $attributes): University
    {
        return DB::transaction(fn (): University => University::create($attributes));
    }

    public function update(University $university, array $attributes): University
    {
        return DB::transaction(function () use ($university, $attributes): University {
            $university->update($attributes);

            return $university->fresh();
        });
    }

    public function delete(University $university): void
    {
        DB::transaction(fn () => $university->delete());
    }
}
