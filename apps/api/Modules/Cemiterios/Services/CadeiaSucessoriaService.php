<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Collection;
use Modules\Cemiterios\Models\SucessaoHerdeiro;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Serviço para validação da cadeia sucessória e ordem de prioridade.
 */
final class CadeiaSucessoriaService
{
    /**
     * Ordem de prioridade padrão (pode ser sobrescrita por configuração do tenant).
     *
     * @var list<Parentesco>
     */
    private const ORDEM_PRIORIDADE_PADRAO = [
        Parentesco::Companheiro,
        Parentesco::Filho,
        Parentesco::Pai,
        Parentesco::Mae,
        Parentesco::Irmao,
        Parentesco::Neto,
        Parentesco::Avo,
        Parentesco::Tio,
        Parentesco::Sobrinho,
        Parentesco::Outro,
    ];

    /**
     * Valida a ordem de prioridade dos herdeiros conforme configuração do tenant.
     *
     * @param array<int, array{nome: string, parentesco: Parentesco, documento?: string|null, ordem: int, direito_representacao?: bool, titular_indicado?: bool, herdeiro_representado_id?: int|null}> $herdeiros
     * @param array<Parentesco>|null $ordemPrioridadeTenant Ordem customizada do tenant
     * @return void
     */
    public function validarOrdemPrioridade(array $herdeiros, ?array $ordemPrioridadeTenant = null): void
    {
        if (empty($herdeiros)) {
            return;
        }

        $ordemPrioridade = $ordemPrioridadeTenant ?? self::ORDEM_PRIORIDADE_PADRAO;
        $mapaOrdem = array_flip(array_map(fn (Parentesco $p) => $p->value, $ordemPrioridade));

        // Agrupa herdeiros por parentesco
        $porParentesco = [];
        foreach ($herdeiros as $index => $herdeiro) {
            $parentesco = $herdeiro['parentesco'] instanceof Parentesco
                ? $herdeiro['parentesco']
                : Parentesco::tryFrom($herdeiro['parentesco']) ?? Parentesco::Outro;

            $porParentesco[$parentesco->value] ??= [];
            $porParentesco[$parentesco->value][] = ['index' => $index, 'ordem' => $herdeiro['ordem']];
        }

        // Valida ordem dentro de cada grupo de parentesco
        foreach ($porParentesco as $parentesco => $grupo) {
            $ordens = array_column($grupo, 'ordem');
            sort($ordens);
            $esperado = range(1, count($grupo));

            if ($ordens !== $esperado) {
                throw new RegraNegocioException(
                    'herdeiro.ordem_invalida',
                    "A ordem dos herdeiros com parentesco '{$parentesco}' deve ser sequencial (1, 2, 3...)."
                );
            }
        }

        // Valida que a ordem dos grupos segue a prioridade
        $parentescosPresentes = array_keys($porParentesco);
        $indicesPrioridade = array_map(fn (string $p) => $mapaOrdem[$p] ?? 999, $parentescosPresentes);
        $indicesOrdenados = $indicesPrioridade;
        sort($indicesOrdenados);

        if ($indicesPrioridade !== $indicesOrdenados) {
            throw new RegraNegocioException(
                'herdeiro.prioridade_invalida',
                'A ordem de prioridade dos grupos de parentesco não segue a configuração do tenant.'
            );
        }
    }

    /**
     * Valida se há exatamente um titular indicado.
     *
     * @param array<int, array{titular_indicado: bool}> $herdeiros
     * @return void
     */
    public function validarTitularUnico(array $herdeiros): void
    {
        $indicados = array_filter($herdeiros, fn ($h) => $h['titular_indicado'] ?? false);

        if (count($indicados) > 1) {
            throw new RegraNegocioException(
                'herdeiro.titular_duplicado',
                'Apenas um herdeiro pode ser indicado como titular.'
            );
        }
    }

    /**
     * Valida o direito de representação.
     *
     * @param array<int, array{direito_representacao: bool, herdeiro_representado_id?: int|null}> $herdeiros
     * @return void
     */
    public function validarDireitoRepresentacao(array $herdeiros): void
    {
        foreach ($herdeiros as $index => $herdeiro) {
            if (($herdeiro['direito_representacao'] ?? false) && empty($herdeiro['herdeiro_representado_id'])) {
                throw new RegraNegocioException(
                    'herdeiro.representado_obrigatorio',
                    "O herdeiro na posição {$index} possui direito de representação mas não informou o herdeiro representado."
                );
            }
        }
    }

    /**
     * Calcula a ordem automática dos herdeiros baseada na prioridade.
     *
     * @param array<int, array{nome: string, parentesco: Parentesco, ordem?: int}> $herdeiros
     * @param array<Parentesco>|null $ordemPrioridadeTenant
     * @return array<int, array{nome: string, parentesco: Parentesco, ordem: int}>
     */
    public function calcularOrdem(array $herdeiros, ?array $ordemPrioridadeTenant = null): array
    {
        $ordemPrioridade = $ordemPrioridadeTenant ?? self::ORDEM_PRIORIDADE_PADRAO;
        $mapaOrdem = array_flip(array_map(fn (Parentesco $p) => $p->value, $ordemPrioridade));

        // Ordena: primeiro pela prioridade do parentesco, depois pela ordem informada
        usort($herdeiros, function (array $a, array $b) use ($mapaOrdem): int {
            $parentescoA = $a['parentesco'] instanceof Parentesco
                ? $a['parentesco']->value
                : ($a['parentesco'] ?? Parentesco::Outro->value);
            $parentescoB = $b['parentesco'] instanceof Parentesco
                ? $b['parentesco']->value
                : ($b['parentesco'] ?? Parentesco::Outro->value);

            $prioridadeA = $mapaOrdem[$parentescoA] ?? 999;
            $prioridadeB = $mapaOrdem[$parentescoB] ?? 999;

            if ($prioridadeA !== $prioridadeB) {
                return $prioridadeA <=> $prioridadeB;
            }

            return ($a['ordem'] ?? 0) <=> ($b['ordem'] ?? 0);
        });

        // Atribui ordem sequencial
        foreach ($herdeiros as $index => &$herdeiro) {
            $herdeiro['ordem'] = $index + 1;
        }

        return $herdeiros;
    }

    /**
     * Obtém a ordem de prioridade configurada (padrão ou tenant).
     *
     * @param array<Parentesco>|null $ordemPrioridadeTenant
     * @return array<Parentesco>
     */
    public function getOrdemPrioridade(?array $ordemPrioridadeTenant = null): array
    {
        return $ordemPrioridadeTenant ?? self::ORDEM_PRIORIDADE_PADRAO;
    }
}