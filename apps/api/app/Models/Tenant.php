<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Tenant extends Model
{
    protected $fillable = ['name', 'slug', 'cnpj', 'type', 'status', 'settings'];
    protected $casts = ['settings' => 'array'];
    public function users(): BelongsToMany { return $this->belongsToMany(User::class)->withPivot('role_id'); }
}
