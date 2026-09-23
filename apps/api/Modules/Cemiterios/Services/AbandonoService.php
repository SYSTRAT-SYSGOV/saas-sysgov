<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Listeners\EnviarEmail;
use Modules\Cemiterios\Models\Exumacao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\ProcessoAbandono;
use Modules\Cemiterios\Models\Vistoria;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;

/** Processo administrativo de abandono: instauração, edital, manifestação e decisão (RF-34..RF-36). */
final readonly class AbandonoService
{
    public function __construct(
        private ParametroService $parametros,
        private JazigoEstadoService $estados,
        private OperacaoService $operacoes,
    ) {}

    public function instaurar(int $plotId): ProcessoAbandono
    {
        $jazigo = Jazigo::findOrFail($plotId);
        $concessao = $jazigo->concessaoVigente()
            ?? throw new RegraNegocioException('abandono.sem_concessao', 'O processo de abandono exige concessão vigente.');

        $vistoria = Vistoria::where('plot_id', $jazigo->id)->orderByDesc('data')->orderByDesc('id')->first();
        if (!in_array($vistoria?->estado_conservacao, ['em_ruina', 'indicio_abandono'], true)) {
            throw new RegraNegocioException('abandono.vistoria_insuficiente', 'A última vistoria do jazigo precisa registrar "em ruína" ou "indício de abandono".');
        }
        if (ProcessoAbandono::where('plot_id', $jazigo->id)->whereIn('situacao', ['instaurado', 'em_edital'])->exists()) {
            throw new RegraNegocioException('abandono.processo_aberto', 'Já existe processo de abandono em andamento para este jazigo.');
        }

        $processo = ProcessoAbandono::create([
            'plot_id' => $jazigo->id, 'concession_id' => $concessao->id, 'inspection_id' => $vistoria->id,
            'instaurado_em' => today()->toDateString(), 'situacao' => 'instaurado',
        ]);

        $titular = $concessao->concessionario()->first();
        if ($titular?->email) {
            EnviarEmail::agendar($titular->email, "Processo de abandono — jazigo {$jazigo->codigo}",
                "Prezado(a) {$titular->nome},\n\nFoi instaurado processo administrativo de abandono do jazigo {$jazigo->codigo} "
                . "(concessão {$concessao->numero}). Compareça à administração do cemitério ou manifeste-se no prazo do edital.");
        }

        return $processo;
    }

    public function edital(ProcessoAbandono $processo, string $publicadoEm): ProcessoAbandono
    {
        $this->exigirSituacao($processo, ['instaurado']);
        $dias = $this->parametros->vigente()->edital_prazo_dias;

        $processo->update([
            'situacao' => 'em_edital',
            'edital_publicado_em' => $publicadoEm,
            'prazo_dias_aplicado' => $dias,
            'prazo_fim' => CarbonImmutable::parse($publicadoEm)->addDays($dias)->toDateString(),
        ]);

        return $processo;
    }

    /** Manifestação do concessionário; regularização aceita arquiva e mantém a concessão. */
    public function manifestacao(ProcessoAbandono $processo, string $texto, bool $arquivar): ProcessoAbandono
    {
        $this->exigirSituacao($processo, ['instaurado', 'em_edital']);
        $processo->update(['manifestacao' => $texto] + ($arquivar ? ['situacao' => 'arquivado'] : []));

        return $processo;
    }

    /**
     * Após o prazo do edital: concessão Extinta, OS de demolição e jazigo em
     * Manutenção até a demolição; restos seguem os prazos legais (RN-01/RN-02).
     */
    public function decidir(ProcessoAbandono $processo, string $decisao): ProcessoAbandono
    {
        $this->exigirSituacao($processo, ['em_edital']);
        if (today()->lt($processo->prazo_fim)) {
            throw new RegraNegocioException('abandono.prazo_edital', 'O prazo do edital ainda não terminou.', ['prazo_fim' => $processo->prazo_fim->toDateString()]);
        }

        return DB::transaction(function () use ($processo, $decisao): ProcessoAbandono {
            $processo->concessao()->update(['situacao' => 'extinta']);
            $jazigo = $processo->jazigo()->firstOrFail();

            if ($jazigo->estado !== EstadoJazigo::Manutencao) {
                $this->estados->manual($jazigo, EstadoJazigo::Manutencao->value, 'Demolição pendente (abandono)', null);
            }

            $ordem = $this->operacoes->emitirOrdem('demolicao', $jazigo->id, null, null, "Processo de abandono #{$processo->id}");
            $processo->update([
                'situacao' => 'decidido',
                'decisao' => $decisao,
                'demolicao_order_id' => $ordem->id,
                'remocao_pendente' => Inumacao::where('plot_id', $jazigo->id)->where('situacao', 'confirmada')->exists(),
            ]);

            $this->liberarRemocoes($processo);

            return $processo->refresh();
        });
    }

    /**
     * Emite a remoção (exumação administrativa) dos restos cujo prazo legal
     * venceu; a pendência encerra quando não restar sepultamento no jazigo.
     */
    public function liberarRemocoes(?ProcessoAbandono $apenas = null): int
    {
        $emitidas = 0;
        $processos = $apenas ? collect([$apenas]) : ProcessoAbandono::where('situacao', 'decidido')->where('remocao_pendente', true)->get();

        foreach ($processos as $processo) {
            $restantes = Inumacao::where('plot_id', $processo->plot_id)->where('situacao', 'confirmada')->get();

            foreach ($restantes as $inumacao) {
                $aberta = Exumacao::where('burial_id', $inumacao->id)->where('situacao', 'deferida')->exists();
                ['anos' => $anos, 'liberada_em' => $liberadaEm] = $this->operacoes->liberacao($inumacao);
                if ($aberta || today()->lt($liberadaEm)) {
                    continue;
                }

                Exumacao::create([
                    'burial_id' => $inumacao->id, 'tipo' => 'administrativa', 'situacao' => 'deferida', 'prazo_aplicado_anos' => $anos,
                    'liberada_em' => $liberadaEm->toDateString(), 'destino' => 'ossuário',
                    'service_order_id' => $this->operacoes->emitirOrdem('exumacao', $processo->plot_id, null, null, "Remoção — abandono #{$processo->id}")->id,
                ]);
                $emitidas++;
            }

            if ($restantes->isEmpty()) {
                $processo->update(['remocao_pendente' => false]);
            }
        }

        return $emitidas;
    }

    /** @param list<string> $situacoes */
    private function exigirSituacao(ProcessoAbandono $processo, array $situacoes): void
    {
        if (!in_array($processo->situacao, $situacoes, true)) {
            throw new RegraNegocioException('abandono.etapa_invalida', "Etapa não permitida para processo {$processo->situacao}.");
        }
    }
}
