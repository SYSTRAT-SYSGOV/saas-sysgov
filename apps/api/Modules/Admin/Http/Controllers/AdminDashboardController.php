<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Services\TenantSummary;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Models\SaasContract;
use Modules\Admin\Models\SaasInvoice;

/**
 * Indicadores e séries reais para a Visão Geral e para Desempenho & Métricas do web-admin.
 * Nada aqui é estimado: sem histórico, as séries vêm zeradas e a tela mostra o estado vazio.
 */
final class AdminDashboardController
{
    use AuthorizesRequests;

    private const MONTHS = 12;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tenant::class);

        $base = Tenant::query()->forUser($request->user());
        $summary = (new TenantSummary())->for($base);
        $tenantIds = (clone $base)->select('tenants.id');

        $months = $this->months();
        $start = Carbon::createFromFormat('Y-m', array_key_first($months))?->startOfMonth() ?? now()->startOfMonth();

        return response()->json([
            'generated_at' => now()->toISOString(),
            'kpis' => [
                'tenants_total' => $summary['total'],
                'tenants_active' => $summary['active'],
                'users_total' => (int) DB::table('tenant_user')->whereIn('tenant_id', $tenantIds)->distinct()->count('user_id'),
                'mrr_cents' => $summary['mrr_cents'],
                'invoices_overdue' => SaasInvoice::query()->withoutGlobalScopes()->whereIn('tenant_id', $tenantIds)->where('status', 'overdue')->count(),
            ],
            'series' => [
                'revenue' => $this->revenue($months, $start, $tenantIds),
                'growth' => $this->growth($months, $start, $tenantIds),
                'contracts' => $this->contracts($months, $tenantIds),
            ],
            'recent_activity' => $this->recentActivity($tenantIds, $request->user()?->is_platform_admin === true),
        ]);
    }

    /**
     * Últimos meses (do mais antigo ao atual), indexados por "Y-m".
     *
     * @return array<string, CarbonInterface>
     */
    private function months(): array
    {
        $months = [];
        for ($i = self::MONTHS - 1; $i >= 0; $i--) {
            $month = now()->startOfMonth()->subMonths($i);
            $months[$month->format('Y-m')] = $month;
        }

        return $months;
    }

    /**
     * Receita paga por mês (faturas pagas no mês).
     *
     * @param array<string, CarbonInterface> $months
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder<Tenant> $tenantIds
     * @return list<array{month: string, paid_cents: int}>
     */
    private function revenue(array $months, CarbonInterface $start, $tenantIds): array
    {
        $totals = array_fill_keys(array_keys($months), 0);

        // Visão entre tenants: o escopo automático por tenant (TenantAware) não se aplica aqui.
        SaasInvoice::query()
            ->withoutGlobalScopes()
            ->whereIn('tenant_id', $tenantIds)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $start)
            ->get(['paid_at', 'amount_cents'])
            ->each(function (SaasInvoice $invoice) use (&$totals): void {
                $key = $this->date($invoice->getAttribute('paid_at'))?->format('Y-m');
                if ($key !== null && array_key_exists($key, $totals)) {
                    $totals[$key] += (int) $invoice->getAttribute('amount_cents');
                }
            });

        return array_map(fn (string $month, int $cents): array => ['month' => $month, 'paid_cents' => $cents], array_keys($totals), $totals);
    }

    /**
     * Novos tenants e novos usuários por mês.
     *
     * @param array<string, CarbonInterface> $months
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder<Tenant> $tenantIds
     * @return list<array{month: string, new_tenants: int, new_users: int}>
     */
    private function growth(array $months, CarbonInterface $start, $tenantIds): array
    {
        $tenants = array_fill_keys(array_keys($months), 0);
        $users = array_fill_keys(array_keys($months), 0);

        DB::table('tenants')->whereIn('id', $tenantIds)->where('created_at', '>=', $start)->pluck('created_at')
            ->each(function ($createdAt) use (&$tenants): void {
                $key = Carbon::parse((string) $createdAt)->format('Y-m');
                if (array_key_exists($key, $tenants)) {
                    $tenants[$key]++;
                }
            });

        DB::table('users')
            ->whereIn('id', DB::table('tenant_user')->whereIn('tenant_id', $tenantIds)->select('user_id'))
            ->where('created_at', '>=', $start)
            ->pluck('created_at')
            ->each(function ($createdAt) use (&$users): void {
                $key = Carbon::parse((string) $createdAt)->format('Y-m');
                if (array_key_exists($key, $users)) {
                    $users[$key]++;
                }
            });

        return array_map(
            fn (string $month): array => ['month' => $month, 'new_tenants' => $tenants[$month], 'new_users' => $users[$month]],
            array_keys($months)
        );
    }

    /**
     * Contratos SaaS novos e encerrados por mês e retenção (null quando não havia contrato ativo no início do mês).
     *
     * @param array<string, CarbonInterface> $months
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder<Tenant> $tenantIds
     * @return list<array{month: string, new: int, ended: int, retention_percent: float|null}>
     */
    private function contracts(array $months, $tenantIds): array
    {
        $rows = SaasContract::query()->withoutGlobalScopes()->whereIn('tenant_id', $tenantIds)->get(['starts_at', 'ends_at', 'status'])
            ->map(fn (SaasContract $c): array => [
                'starts' => $this->date($c->getAttribute('starts_at')),
                'ends' => $this->date($c->getAttribute('ends_at')),
                'active' => $c->getAttribute('status') === 'active',
            ])->all();

        $series = [];
        foreach ($months as $key => $month) {
            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();

            $new = 0;
            $ended = 0;
            $activeAtStart = 0;
            foreach ($rows as $row) {
                $starts = $row['starts'];
                $ends = $row['ends'];
                if ($starts !== null && $starts->between($monthStart, $monthEnd)) {
                    $new++;
                }
                if (!$row['active'] && $ends !== null && $ends->between($monthStart, $monthEnd)) {
                    $ended++;
                }
                if ($starts !== null && $starts->lt($monthStart) && ($row['active'] || $ends === null || $ends->gte($monthStart))) {
                    $activeAtStart++;
                }
            }

            $series[] = [
                'month' => $key,
                'new' => $new,
                'ended' => $ended,
                'retention_percent' => $activeAtStart > 0 ? round((1 - min($ended, $activeAtStart) / $activeAtStart) * 100, 1) : null,
            ];
        }

        return $series;
    }

    /**
     * Últimas entradas da auditoria (analista de suporte só vê a sua carteira).
     *
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder<Tenant> $tenantIds
     * @return list<array<string, mixed>>
     */
    private function recentActivity($tenantIds, bool $platformAdmin): array
    {
        $query = DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->select('audit_logs.id', 'audit_logs.module', 'audit_logs.action', 'audit_logs.resource', 'audit_logs.tenant_id', 'audit_logs.created_at', 'users.name as user_name')
            ->orderByDesc('audit_logs.created_at')
            ->orderByDesc('audit_logs.id')
            ->limit(10);

        if (!$platformAdmin) {
            $query->whereIn('audit_logs.tenant_id', $tenantIds);
        }

        return $query->get()->map(fn ($row): array => (array) $row)->all();
    }

    private function date(mixed $value): ?CarbonInterface
    {
        return $value instanceof CarbonInterface ? $value : null;
    }
}
