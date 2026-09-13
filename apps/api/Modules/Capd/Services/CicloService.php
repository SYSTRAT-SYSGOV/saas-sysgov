<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Carbon\Carbon;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\PlanoMelhoria;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;

/**
 * Gestão de Ciclos de Avaliação de 12 Meses (Triênio de 3 avaliações em 3 anos).
 *
 * Implementa:
 * - Cadência anual automática (abertura do ciclo N+1 em 12 meses)
 * - Validação de elegibilidade (estagiários, comissionados, afastados > 180 dias)
 * - Bloqueios de interstício (mínimo 12 meses) e faltas injustificadas (> 5)
 * - Restrições de integridade e auditoria de mutações
 */
final class CicloService
{
    public function __construct(
        private readonly AuditLogger      $audit,
        private readonly TenantContext    $tenantContext,
        private readonly NotaCalculoService $notaCalculo,
    ) {}

    public function listarCiclos(): Collection
    {
        return CicloAvaliacao::query()
            ->orderByDesc('ano_competencia')
            ->orderByDesc('etapa_cadencia')
            ->get();
    }

    public function criarCiclo(array $dados): CicloAvaliacao
    {
        $tenantId = (int) $this->tenantContext->id();
        $ano = (int) ($dados['ano_competencia'] ?? $dados['ano_referencia'] ?? now()->year);

        $ciclo = DB::transaction(function () use ($tenantId, $ano, $dados): CicloAvaliacao {
            $dataInicio = Carbon::parse($dados['data_inicio'] ?? $dados['data_inicio_avaliacao'] ?? "{$ano}-01-01");
            $dataFim = Carbon::parse($dados['data_fim'] ?? $dados['data_fim_avaliacao'] ?? "{$ano}-12-31");
            $dataLimitePreenchimento = isset($dados['data_limite_preenchimento'])
                ? Carbon::parse($dados['data_limite_preenchimento'])
                : $dataFim->copy()->subMonth();
            $dataLimiteRecurso = isset($dados['data_limite_recurso'])
                ? Carbon::parse($dados['data_limite_recurso'])
                : $dataFim->copy()->addDays(15);

            $ciclo = CicloAvaliacao::create([
                'tenant_id'                 => $tenantId,
                'ano_competencia'           => $ano,
                'ano_referencia'            => $ano,
                'nome'                      => $dados['nome'] ?? "Ciclo de Desempenho {$ano}",
                'data_inicio'               => $dataInicio->toDateString(),
                'data_fim'                  => $dataFim->toDateString(),
                'data_inicio_avaliacao'     => $dataInicio->toDateString(),
                'data_fim_avaliacao'        => $dataFim->toDateString(),
                'data_limite_preenchimento' => $dataLimitePreenchimento->toDateString(),
                'data_limite_recurso'       => $dataLimiteRecurso->toDateString(),
                'status'                    => $dados['status'] ?? CicloAvaliacao::STATUS_ABERTO,
                'cadencia_automatica'       => (bool) ($dados['cadencia_automatica'] ?? true),
                'etapa_cadencia'            => (int) ($dados['etapa_cadencia'] ?? 1),
                'regras_config'             => $dados['regras_config'] ?? null,
                'metadata'                  => $dados['metadata'] ?? [],
            ]);

            $this->audit->record(
                'capd',
                'ciclo.criado',
                "Ciclo #{$ciclo->id} ({$ciclo->nome}) criado para o ano {$ano}",
                null,
                $ciclo->toArray()
            );

            return $ciclo;
        });

        return $ciclo;
    }

    public function atualizarCiclo(CicloAvaliacao $ciclo, array $dados): CicloAvaliacao
    {
        if ($ciclo->status === CicloAvaliacao::STATUS_HOMOLOGADO && isset($dados['status']) && $dados['status'] !== CicloAvaliacao::STATUS_HOMOLOGADO && $dados['status'] !== CicloAvaliacao::STATUS_ENCERRADO) {
            throw new DomainException('Ciclo homologado não pode retornar para status anterior.');
        }

        $before = $ciclo->toArray();
        $ciclo->update($dados);

        $this->audit->record(
            'capd',
            'ciclo.atualizado',
            "Ciclo #{$ciclo->id} ({$ciclo->nome}) atualizado",
            $before,
            $ciclo->fresh()->toArray()
        );

        return $ciclo->fresh();
    }

    public function encerrarCiclo(CicloAvaliacao $ciclo, bool $abrirProximo = false): CicloAvaliacao
    {
        if ($ciclo->temAvaliacoesPendentes()) {
            throw new DomainException('Não é possível encerrar ciclo com avaliações pendentes de conclusão.');
        }

        if ($ciclo->temRecursosPendentes()) {
            throw new DomainException('Não é possível encerrar ciclo com recursos pendentes de julgamento.');
        }

        $ciclo->update(['status' => CicloAvaliacao::STATUS_ENCERRADO]);

        $this->audit->record(
            'capd',
            'ciclo.encerrado',
            "Ciclo #{$ciclo->id} encerrado com sucesso",
            null,
            ['ciclo_id' => $ciclo->id, 'abrir_proximo' => $abrirProximo]
        );

        if ($abrirProximo || $ciclo->cadencia_automatica) {
            $this->abrirProximoCiclo($ciclo);
        }

        return $ciclo->fresh();
    }

    public function abrirProximoCiclo(CicloAvaliacao $cicloAnterior): CicloAvaliacao
    {
        $proximoAno = $cicloAnterior->ano_competencia + 1;
        $proximaEtapa = min(3, ($cicloAnterior->etapa_cadencia ?? 1) + 1);

        $dataInicio = Carbon::parse($cicloAnterior->data_inicio)->addYear();
        $dataFim = Carbon::parse($cicloAnterior->data_fim)->addYear();
        $dataLimitePreenchimento = $cicloAnterior->data_limite_preenchimento
            ? Carbon::parse($cicloAnterior->data_limite_preenchimento)->addYear()
            : $dataFim->copy()->subMonth();
        $dataLimiteRecurso = $cicloAnterior->data_limite_recurso
            ? Carbon::parse($cicloAnterior->data_limite_recurso)->addYear()
            : $dataFim->copy()->addDays(15);

        return $this->criarCiclo([
            'ano_competencia'           => $proximoAno,
            'ano_referencia'            => $proximoAno,
            'nome'                      => "Ciclo de Desempenho {$proximoAno} (Ano {$proximaEtapa})",
            'data_inicio'               => $dataInicio->toDateString(),
            'data_fim'                  => $dataFim->toDateString(),
            'data_limite_preenchimento' => $dataLimitePreenchimento->toDateString(),
            'data_limite_recurso'       => $dataLimiteRecurso->toDateString(),
            'status'                    => CicloAvaliacao::STATUS_ABERTO,
            'cadencia_automatica'       => $cicloAnterior->cadencia_automatica,
            'etapa_cadencia'            => $proximaEtapa,
            'regras_config'             => $cicloAnterior->regras_config,
        ]);
    }

    /**
     * RN-02 / RN-04 — Consolida a NFC trienal de um servidor no ciclo encerrado.
     *
     * Busca os 3 ciclos consecutivos da cadência (etapa 1, 2, 3) do mesmo tenant,
     * calcula a NFC e determina elegibilidade à progressão funcional.
     *
     * Emite evento `capd.nfc.consolidada` via Outbox (assíncrono) para integração
     * com o Módulo de Progressão Funcional.
     *
     * @return array{
     *   servidor_id: int,
     *   notas_ciclos: array<int, string>,
     *   nfc: string,
     *   conceito: string,
     *   elegivel: bool,
     *   nota_corte: string,
     * }
     */
    public function consolidarNfcTrienal(Servidor $servidor, CicloAvaliacao $cicloFinal): array
    {
        // Localiza os 3 ciclos da cadência (base = ano_competencia - etapa + 1)
        $anoBase = $cicloFinal->ano_competencia - ($cicloFinal->etapa_cadencia - 1);

        $ciclos = CicloAvaliacao::query()
            ->where('tenant_id', $cicloFinal->tenant_id)
            ->whereBetween('ano_competencia', [$anoBase, $anoBase + 2])
            ->orderBy('ano_competencia')
            ->limit(3)
            ->get();

        $notasCiclos = [];

        foreach ($ciclos as $ciclo) {
            $avaliacao = Avaliacao::query()
                ->where('ciclo_id', $ciclo->id)
                ->where('servidor_id', $servidor->user_id ?? $servidor->id)
                ->whereNotNull('nota_final')
                ->latest('data_conclusao')
                ->first();

            if ($avaliacao) {
                $notasCiclos[$ciclo->ano_competencia] = (string) $avaliacao->nota_final;
            }
        }

        if (empty($notasCiclos)) {
            throw new DomainException(
                "Servidor #{$servidor->id} não possui avaliações concluídas nos ciclos do triênio."
            );
        }

        $nfc     = $this->notaCalculo->calcularNfc(array_values($notasCiclos));
        $elegivel = $this->notaCalculo->isElegivelProgressao($nfc, $cicloFinal);
        $conceito = $this->notaCalculo->determinarConceito($nfc, $cicloFinal);

        $resultado = [
            'servidor_id'  => $servidor->id,
            'notas_ciclos' => $notasCiclos,
            'nfc'          => $nfc,
            'conceito'     => $conceito,
            'elegivel'     => $elegivel,
            'nota_corte'   => (string) ($cicloFinal->nota_corte_nfc ?? '70.00'),
        ];

        // Publica evento para integração assíncrona (Outbox Pattern)
        OutboxPublisher::dispatch('capd.nfc.consolidada', [
            'tenant_id'   => $cicloFinal->tenant_id,
            'ciclo_id'    => $cicloFinal->id,
            'servidor_id' => $servidor->id,
            'nfc'         => $nfc,
            'elegivel'    => $elegivel,
        ]);

        $this->audit->record(
            'capd',
            'nfc.consolidada',
            "NFC trienal do servidor #{$servidor->id}: {$nfc} pontos — {$conceito} — " . ($elegivel ? 'APTO' : 'INAPTO'),
            null,
            $resultado
        );

        return $resultado;
    }

    // ── Método original de validação de elegibilidade (mantém retrocompatibilidade) ──

    /**
     * Validação das regras de elegibilidade e bloqueio de servidor para o ciclo de 12 meses.
     *
     * @return array{elegivel: bool, bloqueios: list<string>, avisos: list<string>}
     */
    public function validarElegibilidadeServidor(Servidor $servidor, CicloAvaliacao $ciclo): array
    {
        $regras = $ciclo->getRegras();
        $bloqueios = [];
        $avisos = [];

        // 1. Exclusão de estagiários
        $regime = strtolower((string) $servidor->regime_juridico);
        $cargo = strtolower((string) $servidor->cargo_efetivo);

        if (($regras['excluir_estagiarios'] ?? true) && (str_contains($regime, 'estag') || str_contains($cargo, 'estagiario'))) {
            $bloqueios[] = 'Estagiários não são submetidos à Avaliação Periódica de Desempenho.';
        }

        // 2. Exclusão de comissionados puros
        if (($regras['excluir_comissionados'] ?? true) && (str_contains($regime, 'comiss') && ! str_contains($regime, 'efetivo'))) {
            $bloqueios[] = 'Servidores exclusivamente em comissão não participam do ciclo anual da CAPD.';
        }

        // 3. Afastamentos e licenças > 180 dias
        $limiteDiasAfastamento = (int) ($regras['limite_dias_afastamento'] ?? 180);
        $afastamentoLongo = ServidorAfastamento::query()
            ->where('servidor_id', $servidor->id)
            ->where(function ($q) use ($ciclo): void {
                $q->whereBetween('data_inicio', [$ciclo->data_inicio, $ciclo->data_fim])
                    ->orWhere(function ($sub) use ($ciclo): void {
                        $sub->where('data_inicio', '<=', $ciclo->data_fim)
                            ->where(function ($end) use ($ciclo): void {
                                $end->whereNull('data_fim')->orWhere('data_fim', '>=', $ciclo->data_inicio);
                            });
                    });
            })
            ->where('suspende_avaliacao', true)
            ->get();

        $diasAfastadoTotal = 0;
        $temPad = false;

        foreach ($afastamentoLongo as $afastamento) {
            $tipo = strtolower((string) $afastamento->tipo_afastamento);
            if (str_contains($tipo, 'pad') || str_contains($tipo, 'disciplinar') || str_contains(strtolower((string) $afastamento->observacoes), 'pad')) {
                $temPad = true;
            }

            $fim = $afastamento->data_fim ? Carbon::parse($afastamento->data_fim) : Carbon::now();
            $dias = Carbon::parse($afastamento->data_inicio)->diffInDays($fim);
            $diasAfastadoTotal += $dias;
        }

        if ($temPad) {
            $bloqueios[] = 'Servidor com Processo Administrativo Disciplinar (PAD) em curso: avaliação suspensa.';
        }

        if ($diasAfastadoTotal > $limiteDiasAfastamento) {
            $bloqueios[] = "Servidor com afastamentos somando {$diasAfastadoTotal} dias (> {$limiteDiasAfastamento} dias permitidos): avaliação postergada para o próximo ciclo anual.";
        }

        // 4. Mais de 5 faltas injustificadas bloqueia progressão
        $limiteFaltas = (int) ($regras['limite_faltas_injustificadas'] ?? 5);
        $totalFaltas = (int) ($servidor->metadata['faltas_injustificadas'] ?? 0);

        // Verifica também se há registros de faltas no Diário de Bordo
        $faltasCit = DiarioBordo::query()
            ->where('servidor_id', $servidor->user_id ?? 0)
            ->where('ciclo_id', $ciclo->id)
            ->where('tipo', 'negativo')
            ->where('descricao_fato', 'like', '%falta%')
            ->count();

        $totalFaltasComputadas = max($totalFaltas, $faltasCit);

        if ($totalFaltasComputadas > $limiteFaltas) {
            $bloqueios[] = "Servidor possui {$totalFaltasComputadas} falta(s) injustificada(s) no ciclo (limite permitido: {$limiteFaltas}): bloqueio legal de progressão funcional.";
        }

        // 5. Interstício de 12 meses entre avaliações para progressão
        $intersticioMeses = (int) ($regras['intersticio_meses'] ?? 12);
        $ultimaAvaliacaoHomologada = Avaliacao::query()
            ->where('servidor_id', $servidor->user_id)
            ->where('homologada', true)
            ->where('ciclo_id', '!=', $ciclo->id)
            ->latest('homologada_em')
            ->first();

        if ($ultimaAvaliacaoHomologada?->homologada_em) {
            $mesesDesdeUltima = Carbon::parse($ultimaAvaliacaoHomologada->homologada_em)
                ->diffInMonths(Carbon::parse($ciclo->data_inicio));

            if ($mesesDesdeUltima < $intersticioMeses) {
                $avisos[] = "Interstício entre avaliações: última avaliação homologada há {$mesesDesdeUltima} meses (mínimo recomendado: {$intersticioMeses} meses).";
            }
        }

        // 6. Restrição de duplicidade no mesmo ciclo
        $jaAvaliadoNoCiclo = Avaliacao::query()
            ->where('servidor_id', $servidor->user_id)
            ->where('ciclo_id', $ciclo->id)
            ->where('tipo_avaliacao', '!=', Avaliacao::TIPO_PARCIAL)
            ->exists();

        if ($jaAvaliadoNoCiclo) {
            $bloqueios[] = 'Servidor já possui avaliação registrada neste ciclo (unicidade estrita ciclo + servidor).';
        }

        return [
            'elegivel'  => count($bloqueios) === 0,
            'bloqueios' => $bloqueios,
            'avisos'    => $avisos,
        ];
    }
}
