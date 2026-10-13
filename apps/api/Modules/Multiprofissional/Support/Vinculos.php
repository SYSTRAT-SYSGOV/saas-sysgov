<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Support;

use App\Support\TenantContext;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rule;

/** Ajuda nas tabelas de ligação (que também levam tenant_id) e na validação de ids do próprio tenant. */
final class Vinculos
{
    /**
     * @param iterable<int|string, mixed> $ids lista de ids ou [id => colunas extras]
     * @return array<int, array<string, mixed>>
     */
    public static function comTenant(iterable $ids): array
    {
        $tenantId = app(TenantContext::class)->id();
        $sync = [];
        foreach ($ids as $chave => $valor) {
            if (is_array($valor)) {
                $sync[(int) $chave] = ['tenant_id' => $tenantId, ...$valor];
            } else {
                $sync[(int) $valor] = ['tenant_id' => $tenantId];
            }
        }

        return $sync;
    }

    /** Regra `exists` restrita ao tenant atual (impede referenciar registro de outra prefeitura). */
    public static function existe(string $tabela, bool $comExclusaoLogica = false): Exists
    {
        $regra = Rule::exists($tabela, 'id')->where('tenant_id', app(TenantContext::class)->id());

        return $comExclusaoLogica ? $regra->whereNull('deleted_at') : $regra;
    }
}
