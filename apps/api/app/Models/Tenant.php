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
        return (int) $this->modules()
            ->wherePivot('enabled', true)
            ->get()
            ->sum(function ($module): int {
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
