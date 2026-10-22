<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'cnpj', 'type', 'status', 'settings',
        'domain', 'plan', 'max_users', 'storage_limit_mb',
        'monthly_fee_cents', 'setup_fee_cents',
        'custom_domain_enabled', 'custom_domain_fee_cents',
        'city', 'uf', 'cnae', 'website', 'contact_email',
    ];
    protected $casts = [
        'settings' => 'array',
        'custom_domain_enabled' => 'boolean',
        'max_users' => 'integer',
        'storage_limit_mb' => 'integer',
        'monthly_fee_cents' => 'integer',
        'setup_fee_cents' => 'integer',
        'custom_domain_fee_cents' => 'integer',
    ];

    /**
     * Escopo de visibilidade: analista de suporte (sem ser admin da plataforma) enxerga apenas a
     * carteira de clientes liberada (tenant_analyst, vínculo sem expirar).
     *
     * @param \Illuminate\Database\Eloquent\Builder<Tenant> $query
     * @return \Illuminate\Database\Eloquent\Builder<Tenant>
     */
    public function scopeForUser(\Illuminate\Database\Eloquent\Builder $query, ?User $user): \Illuminate\Database\Eloquent\Builder
    {
        if ($user && $user->isSupportAnalyst() && !$user->is_platform_admin) {
            $query->whereIn('tenants.id', fn ($q) => $q
                ->select('tenant_analyst.tenant_id')
                ->from('tenant_analyst')
                ->where('tenant_analyst.user_id', $user->id)
                ->where(fn ($w) => $w->whereNull('tenant_analyst.expires_at')->orWhere('tenant_analyst.expires_at', '>', now()))
            );
        }

        return $query;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role_id');
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(\Modules\Admin\Models\Module::class, 'tenant_module')
            ->withPivot(['enabled', 'settings', 'monthly_fee_cents', 'trial_ends_at']);
    }

    /**
     * Soma da mensalidade dos módulos ativos (preço por tenant ou preço base do catálogo).
     */
    public function modulesMonthlyTotalCents(): int
    {
        // Usa a relação já carregada (listagem) para evitar N+1; senão consulta o banco.
        $modules = $this->relationLoaded('modules')
            ? $this->modules->filter(function ($module): bool {
                /** @var \Modules\Admin\Models\Module $module */
                return (bool) ($module->pivot->enabled ?? false);
            })
            : $this->modules()->wherePivot('enabled', true)->get();

        return (int) $modules->sum(function ($module): int {
            /** @var \Modules\Admin\Models\Module $module */
            $fee = (int) ($module->pivot->monthly_fee_cents ?? 0);
            return $fee > 0 ? $fee : (int) $module->monthly_fee_cents;
        });
    }

    /**
     * Receita mensal recorrente (MRR) do tenant: base + módulos + domínio customizado.
     */
    public function monthlyMrrCents(): int
    {
        $modules = $this->modulesMonthlyTotalCents();
        $customDomain = $this->custom_domain_enabled ? (int) $this->custom_domain_fee_cents : 0;
        return (int) $this->monthly_fee_cents + $modules + $customDomain;
    }
}
