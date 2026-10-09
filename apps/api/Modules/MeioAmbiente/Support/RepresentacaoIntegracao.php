<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Support;

use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;

/**
 * Formato dos dados entregues a órgãos de controle — o mesmo na consulta (pull, API
 * pública) e no envio ativo (push, Outbox), para o órgão não precisar tratar dois
 * contratos. Dados de pessoa física (titular PF, CPF do autuado) nunca saem por aqui:
 * o empreendimento só é identificado quando é pessoa jurídica (razão social/CNPJ são
 * dados públicos); para titular PF vai só o id interno.
 */
final class RepresentacaoIntegracao
{
    /** @return array<string, mixed> */
    public static function empreendimento(Empreendimento $empreendimento): array
    {
        $pessoaJuridica = $empreendimento->cnpj !== null;

        return [
            'id' => $empreendimento->id,
            'pessoa_juridica' => $pessoaJuridica,
            'cnpj' => $pessoaJuridica ? $empreendimento->cnpj : null,
            'razao_social' => $pessoaJuridica ? $empreendimento->razao_social : null,
            'atividade' => $empreendimento->atividade,
            'porte' => $empreendimento->porte,
            'latitude' => (float) $empreendimento->latitude,
            'longitude' => (float) $empreendimento->longitude,
        ];
    }

    /** @return array<string, mixed> */
    public static function licenca(ProcessoLicenciamento $processo): array
    {
        return [
            'id' => $processo->id,
            'numero' => $processo->numero,
            'fase' => $processo->fase,
            'exercicio' => $processo->exercicio,
            'data_deferimento' => $processo->data_deferimento?->toDateString(),
            'validade_em' => $processo->validade_em?->toDateString(),
            'empreendimento' => self::empreendimento($processo->empreendimento),
        ];
    }

    /** @return array<string, mixed> */
    public static function autoInfracao(AutoInfracaoAmbiental $auto): array
    {
        $processo = $auto->documento->processoSancionatorio;

        return [
            'id' => $auto->id,
            'numero' => $auto->documento->numero,
            'tipo_infracao' => $auto->tipo_infracao,
            'area_afetada_ha' => $auto->area_afetada_ha !== null ? (float) $auto->area_afetada_ha : null,
            'reincidente' => $auto->reincidente,
            'emitido_em' => $auto->created_at?->toIso8601String(),
            'processo_sancionatorio' => $processo === null ? null : [
                'status' => $processo->status,
                'penalidade_centavos' => $processo->penalidade_centavos,
            ],
            'empreendimento' => self::empreendimento($auto->empreendimento),
        ];
    }
}
