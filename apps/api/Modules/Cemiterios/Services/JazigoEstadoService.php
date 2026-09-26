<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\JazigoHistorico;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Único ponto que altera estado e ocupação do jazigo (RF-04, RF-05, RNF-06).
 *
 * O estado é DERIVADO: Em Ruína/Manutenção só entra e sai por ação manual;
 * fora dela, ocupação ≥ capacidade → Capacidade Máxima; ocupação > 0 →
 * Ocupado; concessão vigente → Concedido; senão Disponível. Toda gravação usa
 * lock_version (optimistic locking) e registra o histórico quando o estado muda.
 */
final class JazigoEstadoService
{
    public function alterarOcupacao(Jazigo $jazigo, int $delta, string $motivo, ?int $versaoEsperada = null): Jazigo
    {
        $ocupacao = $jazigo->ocupacao + $delta;

        if ($ocupacao > $jazigo->capacidade) {
            throw new RegraNegocioException('jazigo.capacidade_maxima', 'Jazigo em capacidade máxima.');
        }

        return $this->persistir($jazigo, max(0, $ocupacao), null, $motivo, 'operacao', $versaoEsperada);
    }

    /** Reavalia o estado após mudança na concessão (ativação, expiração, extinção). */
    public function recalcular(Jazigo $jazigo, string $motivo, ?int $versaoEsperada = null): Jazigo
    {
        return $this->persistir($jazigo, $jazigo->ocupacao, null, $motivo, 'operacao', $versaoEsperada);
    }

    /** Transição manual: apenas entrar em manutenção ou sair dela (RF-04). */
    public function manual(Jazigo $jazigo, string $para, string $motivo, ?int $versaoEsperada): Jazigo
    {
        $emManutencao = $jazigo->estado === EstadoJazigo::Manutencao;

        $forcado = match (true) {
            $para === EstadoJazigo::Manutencao->value && !$emManutencao => EstadoJazigo::Manutencao,
            $para === 'restaurar' && $emManutencao => false,
            default => throw new RegraNegocioException(
                'jazigo.transicao_invalida',
                'Transição manual inválida: só é permitido entrar ou sair de Em Ruína/Manutenção.',
            ),
        };

        return $this->persistir($jazigo, $jazigo->ocupacao, $forcado, $motivo, 'manual', $versaoEsperada);
    }

    /**
     * @param EstadoJazigo|false|null $forcado null = mantém manutenção se já estiver; false = sai da manutenção
     */
    private function persistir(Jazigo $jazigo, int $ocupacao, EstadoJazigo|false|null $forcado, string $motivo, string $origem, ?int $versaoEsperada): Jazigo
    {
        $versao = $versaoEsperada ?? $jazigo->lock_version;
        $anterior = $jazigo->estado;
        $novo = $forcado ?: $this->derivar($jazigo, $ocupacao, $forcado === false);

        DB::transaction(function () use ($jazigo, $ocupacao, $novo, $anterior, $versao, $motivo, $origem): void {
            $afetadas = Jazigo::query()
                ->whereKey($jazigo->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'ocupacao' => $ocupacao,
                    'estado' => $novo->value,
                    'lock_version' => $versao + 1,
                    'updated_at' => now(),
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            if ($novo !== $anterior) {
                JazigoHistorico::create([
                    'plot_id' => $jazigo->getKey(),
                    'de' => $anterior->value,
                    'para' => $novo->value,
                    'motivo' => $motivo,
                    'origem' => $origem,
                    'autor_id' => auth()->id(),
                    'ocorrido_em' => now(),
                ]);
            }
        });

        GisService::invalidar((int) $jazigo->tenant_id); // a cor do jazigo no mapa depende do estado

        return $jazigo->refresh();
    }

    private function derivar(Jazigo $jazigo, int $ocupacao, bool $saindoDaManutencao): EstadoJazigo
    {
        if ($jazigo->estado === EstadoJazigo::Manutencao && !$saindoDaManutencao) {
            return EstadoJazigo::Manutencao;
        }

        return match (true) {
            $ocupacao >= $jazigo->capacidade => EstadoJazigo::CapacidadeMaxima,
            $ocupacao > 0 => EstadoJazigo::Ocupado,
            $jazigo->concessaoVigente() !== null => EstadoJazigo::Concedido,
            default => EstadoJazigo::Disponivel,
        };
    }
}
