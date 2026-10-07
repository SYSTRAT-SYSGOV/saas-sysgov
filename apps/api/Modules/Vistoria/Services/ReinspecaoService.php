<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Reinspecao;

final class ReinspecaoService
{
    public function __construct(
        private AuditLogger $audit,
    ) {}

    /**
     * Agenda o acompanhamento de regularização de um auto de infração, vinculando a
     * vistoria original ao auto e à ordem de serviço de reinspeção — reaproveitando a OS
     * já criada por `DocumentoService::emitirDocumento()` (tarefa 6.4) quando informada, ou
     * criando uma nova quando não (chamado pelo `VerificarPrazosReinspecaoJob` como
     * rede de segurança). Idempotente por `documento_id` (um acompanhamento por auto) e
     * indiferente a autos sem prazo de regularização.
     */
    public function agendar(Documento $documento, ?OrdemServico $ordemReinspecao = null): ?Reinspecao
    {
        if ($documento->prazo_limite === null) {
            return null;
        }

        $existente = Reinspecao::where('documento_id', $documento->id)->first();
        if ($existente) {
            return $existente;
        }

        $documento->loadMissing('execucao.ordemServico');
        $ordemOriginal = $documento->execucao->ordemServico;

        $ordemReinspecao ??= OrdemServico::create([
            'local_id' => $ordemOriginal->local_id,
            'org_unit_id' => $ordemOriginal->org_unit_id,
            'fiscal_id' => $ordemOriginal->fiscal_id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_REINSPECAO,
            'criticidade' => $ordemOriginal->criticidade,
            'data_prevista' => $documento->prazo_limite,
            'roteiro_deslocamento' => "Reinspeção de regularização — documento {$documento->numero}.",
        ]);

        $reinspecao = Reinspecao::create([
            'documento_id' => $documento->id,
            'ordem_servico_original_id' => $ordemOriginal->id,
            'ordem_servico_reinspecao_id' => $ordemReinspecao->id,
            'status' => Reinspecao::STATUS_PENDENTE,
            'data_limite' => $documento->prazo_limite,
        ]);

        $this->audit->record('vistoria', 'reinspecao.agendada', "Reinspecao #{$reinspecao->id} (Documento #{$documento->id})", null, $reinspecao->toArray());

        return $reinspecao;
    }

    /**
     * Constata se a irregularidade foi regularizada dentro do prazo, encerrando o
     * acompanhamento de prazo desta reinspeção (estado terminal — não agenda um novo
     * ciclo automaticamente, mesmo quando não regularizado).
     *
     * @throws \DomainException quando a regularização já foi constatada anteriormente
     */
    public function constatarRegularizacao(Reinspecao $reinspecao, bool $regularizado, ?string $observacao = null): Reinspecao
    {
        if ($reinspecao->status !== Reinspecao::STATUS_PENDENTE) {
            throw new \DomainException('A regularização desta reinspeção já foi constatada.');
        }

        $antes = $reinspecao->toArray();
        $reinspecao->update([
            'status' => $regularizado ? Reinspecao::STATUS_REGULARIZADO : Reinspecao::STATUS_NAO_REGULARIZADO,
            'constatada_em' => now(),
            'observacao' => $observacao,
        ]);

        $this->audit->record('vistoria', 'reinspecao.regularizacao_constatada', "Reinspecao #{$reinspecao->id}", $antes, $reinspecao->toArray());

        return $reinspecao;
    }
}
