<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

final class UserInvitation extends Model
{
    protected $table = 'user_invitations';

    protected $fillable = [
        'tenant_id',
        'email',
        'token',
        'role_slug',
        'invited_by',
        'expires_at',
        'accepted_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    protected $hidden = ['token'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_slug', 'slug');
    }

    /**
     * Scope for valid (not expired, not accepted) invitations
     *
     * @param Builder<UserInvitation> $query
     * @return Builder<UserInvitation>
     */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where('accepted_at', null)
            ->where('expires_at', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }
}