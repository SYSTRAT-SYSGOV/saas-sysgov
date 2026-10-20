<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Models\Tenant;
use App\Support\TenantContext;
use Modules\Pessoas\Support\RegraNegocioException;

/**
 * Trava da remoção das colunas civis duplicadas de um módulo (unificar-cadastro-pessoas, D6): só libera
 * quando, em todos os tenants, todo registro do módulo referencia uma pessoa e não há divergência aberta.
 * Para uso nas migrations de remoção: `app(TravaRemocaoColunasService::class)->exigir('escola')`.
 */
final class TravaRemocaoColunasService
{
    public function __construct(
        private readonly AdocaoPessoaService $adocao,
        private readonly TenantContext $contexto,
    ) {}

    /** @return list<string> motivos do bloqueio; vazio quando a remoção está liberada */
    public function motivos(string $modulo): array
    {
        $motivos = [];
        foreach (Tenant::query()->get() as $tenant) {
            $this->contexto->set($tenant);
            try {
                $linha = collect($this->adocao->relatorio()['modulos'])->firstWhere('modulo', $modulo);
            } finally {
                $this->contexto->clear();
            }
            if ($linha === null) {
                return ["O módulo {$modulo} não tem conciliação registrada."];
            }
            if ($linha['sem_vinculo'] > 0) {
                $motivos[] = "{$linha['sem_vinculo']} registro(s) sem pessoa vinculada no tenant {$tenant->slug}.";
            }
            if ($linha['divergencias_abertas'] > 0) {
                $motivos[] = "{$linha['divergencias_abertas']} divergência(s) aberta(s) no tenant {$tenant->slug}.";
            }
        }

        return $motivos;
    }

    public function liberada(string $modulo): bool
    {
        return $this->motivos($modulo) === [];
    }

    /** @throws RegraNegocioException quando a remoção está bloqueada */
    public function exigir(string $modulo): void
    {
        $motivos = $this->motivos($modulo);
        if ($motivos !== []) {
            throw new RegraNegocioException('remocao_bloqueada', "Remoção das colunas do módulo {$modulo} bloqueada: " . implode(' ', $motivos), ['motivos' => $motivos]);
        }
    }
}
