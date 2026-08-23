<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class University extends Model
{
    protected $fillable = ['name', 'country', 'city', 'website', 'ranking', 'logo_url', 'description', 'programs', 'is_active'];

    protected function casts(): array
    {
        return ['programs' => 'array', 'ranking' => 'integer', 'is_active' => 'boolean'];
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class);
    }
}
