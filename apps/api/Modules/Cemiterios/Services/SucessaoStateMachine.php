<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoHistorico;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Máquina de estados do processo sucessório (RF-SUCESSAO).
 *
 * Estados: Solicitada → Em_analise → Aguardando_documentos → Validada → Sucedida
 *                    ↓                              ↓
 *               Indeferida ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
 *                    ↓
 *               Arquivada
 *
 * Toda transição usa lock_version (optimistic locking) e registra no histórico.
 */
final class SucessaoStateMachine
{
    /** @var array<string, list<string>> */
    private const TRANSICOES_VALIDAS = [
        EstadoSucessao::Solicitada->value => [EstadoSucessao::EmAnalise->value],
        EstadoSucessao::EmAnalise->value => [
            EstadoSucessao::AguardandoDocumentos->value,
            EstadoSucessao::Validada->value,
            EstadoSucessao::Indeferida->value,
        ],
        EstadoSucessao::AguardandoDocumentos->value => [
            EstadoSucessao::EmAnalise->value,
            EstadoSucessao::Arquivada->value,
        ],
        EstadoSucessao::Validada->value => [
            EstadoSucessao::Sucedida->value,
            EstadoSucessao::Indeferida->value,
        ],
        EstadoSucessao::Indeferida->value => [
            EstadoSucessao::Arquivada->value,
        ],
        EstadoSucessao::Sucedida->value => [],
        EstadoSucessao::Arquivada->value => [],
    ];

    /**
     * Verifica se uma transição é válida.
     */
    public function canTransition(string $de, string $para): bool
    {
        return in_array($para, self::TRANSICOES_VALIDAS[$de] ?? [], true);
    }

    /**
     * Executa a transição de estado do processo sucessório.
     *
     * @param Sucessao $sucessao Processo sucessório
     * @param EstadoSucessao $para Estado de destino
     * @param string $motivo Motivo/parecer da transição
     * @param ?int $lockVersion Versão esperada para optimistic locking
     * @return Sucessao Processo atualizado
     */
    public function transition(Sucessao $sucessao, EstadoSucessao $para, string $motivo, ?int $lockVersion = null): Sucessao
    {
        $de = EstadoSucessao::tryFrom($sucessao->estado->value) ?? throw new RegraNegocioException(
            'sucessao.estado_invalido',
            "Estado atual do processo é inválido: {$sucessao->estado->value}"
        );

        if (!$this->canTransition($de->value, $para->value)) {
            throw new RegraNegocioException(
                'sucessao.transicao_invalida',
                "Transição inválida de {$de->value} para {$para->value}"
            );
        }

        $versao = $lockVersion ?? $sucessao->lock_version;

        return DB::transaction(function () use ($sucessao, $de, $para, $motivo, $versao): Sucessao {
            $afetadas = Sucessao::query()
                ->whereKey($sucessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => $para->value,
                    'lock_version' => $versao + 1,
                    'updated_at' => now(),
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            // Registra no histórico append-only
            SucessaoHistorico::create([
                'tenant_id' => $sucessao->tenant_id,
                'sucessao_id' => $sucessao->getKey(),
                'de_estado' => $de->value,
                'para_estado' => $para->value,
                'motivo' => $this->formatarMotivo($motivo),
                'usuario_id' => auth()->id(),
            ]);

            return $sucessao->refresh();
        });
    }

    /**
     * Retorna as transições válidas a partir de um estado.
     *
     * @return list<string>
     */
    public function getTransicoesValidas(string $de): array
    {
        return self::TRANSICOES_VALIDAS[$de] ?? [];
    }

    /**
     * Verifica se o estado é terminal.
     */
    public function isTerminal(EstadoSucessao $estado): bool
    {
        return empty(self::TRANSICOES_VALIDAS[$estado->value] ?? []);
    }

    /**
     * Formata o motivo para armazenamento no histórico.
     */
    private function formatarMotivo(string $motivo): array
    {
        return [
            'parecer' => $motivo,
            'created_at' => now()->toIso8601String(),
        ];
    }
}