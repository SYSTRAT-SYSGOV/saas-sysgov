<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Totais de um conjunto de tenants (tenants, ativos, MRR e usuários) calculados no banco.
 * Usado pela listagem de tenants e pelo dashboard administrativo (mesma regra de MRR).
 */
final class TenantSummary
{
    /**
     * @param Builder<Tenant> $base conjunto já filtrado (escopo + filtros)
     * @return array{total: int, active: int, mrr_cents: int, user_count: int}
     */
    public function for(Builder $base): array
    {
        $ids = (clone $base)->select('tenants.id');

        $modulesCents = (int) DB::table('tenant_module as tm')
            ->join('modules as m', 'm.id', '=', 'tm.module_id')
            ->whereIn('tm.tenant_id', $ids)
            ->where('tm.enabled', true)
            ->sum(DB::raw('CASE WHEN tm.monthly_fee_cents > 0 THEN tm.monthly_fee_cents ELSE m.monthly_fee_cents END'));

        return [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('status', 'active')->count(),
            'mrr_cents' => (int) (clone $base)->sum('monthly_fee_cents')
                + (int) (clone $base)->where('custom_domain_enabled', true)->sum('custom_domain_fee_cents')
                + $modulesCents,
            'user_count' => DB::table('tenant_user')->whereIn('tenant_id', $ids)->count(),
        ];
    }
}
