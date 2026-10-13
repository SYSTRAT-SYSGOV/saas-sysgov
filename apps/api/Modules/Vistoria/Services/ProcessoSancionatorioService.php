<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\Money;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Vistoria\Events\ProcessoSancionatorioAberto;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class ProcessoSancionatorioService
{
    /** Dias corridos, simplificação — não há parametrização por tipo de infração/norma neste repositório. */
    private const PRAZO_DEFESA_DIAS_PADRAO = 10;

    private const PRAZO_RECURSO_DIAS_PADRAO = 10;

    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
    ) {}

    /**
     * Abre automaticamente o processo sancionatório ao emitir um auto de infração
     * (chamado por `DocumentoService::emitirDocumento()`), calculando o prazo de defesa.
     * Idempotente por `documento_id` (um processo por auto de infração) e indiferente a
     * outros tipos de documento (notificação, termo de embargo/apreensão não abrem processo).
     */
    public function abrirAutomaticamente(Documento $documento, ?int $prazoDefesaDias = null): ?ProcessoSancionatorio
    {
        if ($documento->tipo !== Documento::TIPO_AUTO_INFRACAO) {
            return null;
        }

        $existente = ProcessoSancionatorio::where('documento_id', $documento->id)->first();
        if ($existente) {
            return $existente;
        }

        $prazoLimite = now()->addDays($prazoDefesaDias ?? self::PRAZO_DEFESA_DIAS_PADRAO)->toDateString();

        $processo = DB::transaction(fn (): ProcessoSancionatorio => ProcessoSancionatorio::create([
            'documento_id' => $documento->id,
            'status' => ProcessoSancionatorio::STATUS_ABERTO,
            'prazo_defesa_limite' => $prazoLimite,
        ]));

        $this->audit->record('vistoria', 'processo_sancionatorio.aberto', "ProcessoSancionatorio #{$processo->id} (Documento #{$documento->id})", null, $processo->toArray());
        $this->outbox->publish('vistoria.processo_sancionatorio.aberto', ['processo_sancionatorio_id' => $processo->id, 'documento_id' => $documento->id]);
        ProcessoSancionatorioAberto::dispatch($processo);

        return $processo;
    }

    /**
     * Registra a defesa apresentada pelo autuado, movendo o processo para `em_defesa`.
     *
     * @throws \DomainException quando o processo não está em `aberto` ou falta o texto da defesa
     */
    public function apresentarDefesa(ProcessoSancionatorio $processo, string $texto): ProcessoSancionatorio
    {
        $this->garantirTransicao($processo, ProcessoSancionatorio::STATUS_EM_DEFESA);

        if (trim($texto) === '') {
            throw new \DomainException('O texto da defesa é obrigatório.');
        }

        $antes = $processo->toArray();
        $processo->update([
            'status' => ProcessoSancionatorio::STATUS_EM_DEFESA,
            'defesa_texto' => $texto,
            'defesa_apresentada_em' => now(),
        ]);

        $this->audit->record('vistoria', 'processo_sancionatorio.defesa_apresentada', "ProcessoSancionatorio #{$processo->id}", $antes, $processo->toArray());

        return $processo;
    }

    /**
     * Julga o processo (procedente → aplica penalidade em centavos e abre prazo de
     * recurso; improcedente → arquiva). Válido a partir de `em_defesa` ou `em_julgamento`
     * (revelia da defesa) — o julgamento em si independe de ter havido defesa.
     *
     * @throws \DomainException quando a decisão é inválida, o processo não está num estado
     *                           julgável, ou falta a penalidade quando procedente
     */
    public function julgar(
        ProcessoSancionatorio $processo,
        string $decisao,
        string $fundamentacao,
        User $julgador,
        ?int $penalidadeCentavos = null,
        ?int $prazoRecursoDias = null,
    ): ProcessoSancionatorio {
        if (! in_array($decisao, [ProcessoSancionatorio::DECISAO_PROCEDENTE, ProcessoSancionatorio::DECISAO_IMPROCEDENTE], true)) {
            throw new \DomainException("Decisão de julgamento inválida: {$decisao}.");
        }

        $procedente = $decisao === ProcessoSancionatorio::DECISAO_PROCEDENTE;
        $novoStatus = $procedente ? ProcessoSancionatorio::STATUS_PENALIDADE_APLICADA : ProcessoSancionatorio::STATUS_ARQUIVADO;

        $this->garantirTransicao($processo, $novoStatus);

        if ($procedente) {
            if ($penalidadeCentavos === null) {
                throw new \DomainException('A penalidade (em centavos) é obrigatória quando a decisão é procedente.');
            }

            try {
                new Money($penalidadeCentavos);
            } catch (\InvalidArgumentException $e) {
                throw new \DomainException($e->getMessage());
            }
        }

        $antes = $processo->toArray();
        $processo->update([
            'status' => $novoStatus,
            'julgamento_decisao' => $decisao,
            'julgamento_fundamentacao' => $fundamentacao,
            'penalidade_centavos' => $procedente ? $penalidadeCentavos : null,
            'julgado_em' => now(),
            'julgado_por' => $julgador->id,
            'prazo_recurso_limite' => $procedente
                ? now()->addDays($prazoRecursoDias ?? self::PRAZO_RECURSO_DIAS_PADRAO)->toDateString()
                : null,
        ]);

        $this->audit->record('vistoria', 'processo_sancionatorio.julgado', "ProcessoSancionatorio #{$processo->id}", $antes, $processo->toArray());

        return $processo;
    }

    /**
     * Registra o recurso apresentado contra a penalidade aplicada, movendo o processo
     * para `em_recurso`.
     *
     * @throws \DomainException quando o processo não está em `penalidade_aplicada` ou falta o texto do recurso
     */
    public function apresentarRecurso(ProcessoSancionatorio $processo, string $texto): ProcessoSancionatorio
    {
        $this->garantirTransicao($processo, ProcessoSancionatorio::STATUS_EM_RECURSO);

        if (trim($texto) === '') {
            throw new \DomainException('O texto do recurso é obrigatório.');
        }

        $antes = $processo->toArray();
        $processo->update([
            'status' => ProcessoSancionatorio::STATUS_EM_RECURSO,
            'recurso_texto' => $texto,
            'recurso_apresentado_em' => now(),
        ]);

        $this->audit->record('vistoria', 'processo_sancionatorio.recurso_apresentado', "ProcessoSancionatorio #{$processo->id}", $antes, $processo->toArray());

        return $processo;
    }

    /**
     * Julga o recurso (provido ou improvido) — em ambos os casos conclui o processo,
     * já que é a última instância administrativa modelada neste módulo.
     *
     * @throws \DomainException quando a decisão é inválida ou o processo não está em `em_recurso`
     */
    public function julgarRecurso(ProcessoSancionatorio $processo, string $decisao, string $fundamentacao, User $julgador): ProcessoSancionatorio
    {
        if (! in_array($decisao, [ProcessoSancionatorio::RECURSO_PROVIDO, ProcessoSancionatorio::RECURSO_IMPROVIDO], true)) {
            throw new \DomainException("Decisão de recurso inválida: {$decisao}.");
        }

        $this->garantirTransicao($processo, ProcessoSancionatorio::STATUS_CONCLUIDO);

        $antes = $processo->toArray();
        $processo->update([
            'status' => ProcessoSancionatorio::STATUS_CONCLUIDO,
            'recurso_decisao' => $decisao,
            'recurso_fundamentacao' => $fundamentacao,
            'recurso_decidido_em' => now(),
            'recurso_decidido_por' => $julgador->id,
            'concluido_em' => now(),
        ]);

        $this->audit->record('vistoria', 'processo_sancionatorio.recurso_julgado', "ProcessoSancionatorio #{$processo->id}", $antes, $processo->toArray());

        return $processo;
    }

    /**
     * Avança automaticamente um processo cujo prazo (de defesa ou de recurso) venceu sem
     * manifestação — chamado pelo `VerificarPrazosProcessoJob` (seção 9.4). A partir de
     * `aberto` é revelia da defesa (segue para julgamento); a partir de
     * `penalidade_aplicada` é revelia do recurso (conclui mantendo a penalidade).
     *
     * @throws \DomainException quando o processo não está num estado com prazo pendente de revelia
     */
    public function registrarRevelia(ProcessoSancionatorio $processo): ProcessoSancionatorio
    {
        $novoStatus = $processo->status === ProcessoSancionatorio::STATUS_ABERTO
            ? ProcessoSancionatorio::STATUS_EM_JULGAMENTO
            : ProcessoSancionatorio::STATUS_CONCLUIDO;

        $this->garantirTransicao($processo, $novoStatus);

        $antes = $processo->toArray();
        $dados = ['status' => $novoStatus];
        if ($novoStatus === ProcessoSancionatorio::STATUS_CONCLUIDO) {
            $dados['concluido_em'] = now();
        }
        $processo->update($dados);

        $this->audit->record('vistoria', 'processo_sancionatorio.revelia', "ProcessoSancionatorio #{$processo->id}", $antes, $processo->toArray());

        return $processo;
    }

    private function garantirTransicao(ProcessoSancionatorio $processo, string $novoStatus): void
    {
        $permitidas = ProcessoSancionatorio::TRANSICOES_VALIDAS[$processo->status] ?? [];
        if (! in_array($novoStatus, $permitidas, true)) {
            throw new \DomainException("Transição inválida de \"{$processo->status}\" para \"{$novoStatus}\".");
        }
    }
}
