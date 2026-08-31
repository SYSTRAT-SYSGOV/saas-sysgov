<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserInvitation;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class InvitationService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    /**
     * Invite a user (SYSTRAT or tenant)
     * RN-USR-004: token único + expiração 72h
     * RN-USR-010: e-mail via Outbox/fila
     */
    public function invite(string $email, Role $role, ?Tenant $tenant, User $invitedBy): UserInvitation
    {
        // Check for existing valid invitation
        $existing = UserInvitation::valid()
            ->where('email', $email)
            ->where('role_slug', $role->slug)
            ->when($tenant, fn($q) => $q->where('tenant_id', $tenant->id))
            ->first();

        if ($existing) {
            return $existing;
        }

        // Generate secure token
        $token = Str::random(64);
        $tokenHash = hash('sha256', $token);

        $invitation = UserInvitation::create([
            'tenant_id' => $tenant?->id,
            'email' => $email,
            'token' => $tokenHash,
            'role_slug' => $role->slug,
            'invited_by' => $invitedBy->id,
            'expires_at' => now()->addHours(72), // RN-USR-004: 72h
        ]);

        // Queue email via Outbox (RN-USR-010)
        $this->outbox->publish('UserInvited', [
            'invitation_id' => $invitation->id,
            'email' => $email,
            'role' => $role->slug,
            'tenant_id' => $tenant?->id,
            'token' => $token, // Only sent via email, not stored
            'expires_at' => $invitation->expires_at->toISOString(),
        ]);

        return $invitation;
    }

    /**
     * Accept invitation by token
     * RN-USR-004: token validation, 410 if expired, 409 if already accepted
     */
    public function accept(string $token): User
    {
        $tokenHash = hash('sha256', $token);

        $invitation = UserInvitation::where('token', $tokenHash)->first();

        if (!$invitation) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'token' => 'Convite inválido ou expirado.',
            ]);
        }

        if ($invitation->isExpired()) {
            // RN-USR-004: reuso do token após expirar → 410 Gone
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(410, 'Este convite expirou. Solicite um novo.');
        }

        if ($invitation->isAccepted()) {
            // aceitar duas vezes → 409 Conflict
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'Este convite já foi aceito.');
        }

        $role = Role::where('slug', $invitation->role_slug)
            ->when($invitation->tenant_id, fn($q) => $q->where('tenant_id', $invitation->tenant_id))
            ->firstOrFail();

        return DB::transaction(function () use ($invitation, $role): User {
            // Create or find user
            $user = User::updateOrCreate(
                ['email' => $invitation->email],
                [
                    'name' => explode('@', $invitation->email)[0], // Will be updated by user
                    'password' => null, // User will set via reset password
                    'is_systrat' => $invitation->tenant_id === null,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );

            // Assign role and tenant link
            if ($invitation->tenant_id) {
                $user->tenants()->syncWithoutDetaching([
                    $invitation->tenant_id => [
                        'role_id' => $role->id,
                        'status' => 'active',
                        'is_primary' => true,
                    ]
                ]);
            }

            $user->roles()->syncWithoutDetaching([$role->id]);
            if ($invitation->tenant_id && \Illuminate\Support\Facades\Schema::hasColumn('role_user', 'tenant_id')) {
                \Illuminate\Support\Facades\DB::table('role_user')
                    ->where('role_id', $role->id)
                    ->where('user_id', $user->id)
                    ->update(['tenant_id' => $invitation->tenant_id]);
            }
            $user->clearPermissionCache($invitation->tenant_id);

            // Mark invitation as accepted
            $invitation->update(['accepted_at' => now()]);

            $this->audit->record('admin', 'invitation.accepted', "Invitation #{$invitation->id}", null, [
                'user_id' => $user->id,
                'invitation_id' => $invitation->id,
            ]);

            // Queue welcome email via Outbox
            $this->outbox->publish('InvitationAccepted', [
                'user_id' => $user->id,
                'invitation_id' => $invitation->id,
            ]);

            return $user->fresh(['roles', 'tenants']);
        });
    }

    /**
     * Resend invitation with new token
     */
    public function resend(UserInvitation $invitation): UserInvitation
    {
        $invitation->update([
            'token' => hash('sha256', $token = Str::random(64)),
            'expires_at' => now()->addHours(72),
            'accepted_at' => null,
        ]);

        $this->outbox->publish('UserInvited', [
            'invitation_id' => $invitation->id,
            'email' => $invitation->email,
            'role' => $invitation->role_slug,
            'tenant_id' => $invitation->tenant_id,
            'token' => $token,
            'expires_at' => $invitation->expires_at->toISOString(),
        ]);

        return $invitation->fresh();
    }

    /**
     * Cancel invitation
     */
    public function cancel(UserInvitation $invitation): void
    {
        $before = $invitation->toArray();
        $invitation->delete();

        $this->audit->record('admin', 'invitation.cancelled', "Invitation #{$invitation->id}", $before, null);
    }

    /**
     * List pending invitations
     *
     * @return \Illuminate\Pagination\LengthAwarePaginator<int, \App\Models\UserInvitation>
     */
    public function listPending(?int $tenantId = null, int $perPage = 25): \Illuminate\Pagination\LengthAwarePaginator
    {
        return UserInvitation::query()
            ->valid()
            ->with(['inviter', 'role'])
            ->when($tenantId, fn($q) => $q->where('tenant_id', $tenantId))
            ->latest()
            ->paginate($perPage);
    }
}