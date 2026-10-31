<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Models\Vistoria;

/** Formato JSON do módulo. Documentos da pessoa saem sempre mascarados. */
final class Formata
{
    /** @return array<string, mixed> */
    public function empresa(Empresa $e): array
    {
        $pessoa = $e->pessoa;

        return [
            'id' => $e->id,
            'pessoa_id' => $e->pessoa_id,
            'nome' => $e->nome(),
            'nome_fantasia' => $pessoa?->nome_fantasia,
            'cnpj_mascarado' => $pessoa?->documento_mascarado,
            'tipo' => $e->tipo,
            'tipo_rotulo' => $e->tipoEnum()->label(),
            'contrato_numero' => $e->contrato_numero,
            'vigencia_inicio' => $e->vigencia_inicio->toDateString(),
            'vigencia_fim' => $e->vigencia_fim->toDateString(),
            'contrato_vencido' => $e->contratoVencido(),
            'ativa' => $e->ativa,
            'observacoes' => $e->observacoes,
        ];
    }

    /** @return array<string, mixed> */
    public function motorista(Motorista $m): array
    {
        $motivos = $m->motivosInelegibilidade();

        return [
            'id' => $m->id,
            'pessoa_id' => $m->pessoa_id,
            'nome' => $m->nome(),
            'cpf_mascarado' => $m->pessoa?->cpf_mascarado,
            'empresa' => $m->empresa !== null ? ['id' => $m->empresa->id, 'nome' => $m->empresa->nome()] : null,
            'cnh_numero' => $m->cnh_numero,
            'cnh_categoria' => $m->cnh_categoria,
            'cnh_primeira_habilitacao' => $m->cnh_primeira_habilitacao?->toDateString(),
            'cnh_validade' => $m->cnh_validade->toDateString(),
            'curso_certificado' => $m->curso_certificado,
            'curso_validade' => $m->curso_validade?->toDateString(),
            'toxicologico_data' => $m->toxicologico_data?->toDateString(),
            'toxicologico_validade' => $m->toxicologico_validade?->toDateString(),
            'ativo' => $m->ativo,
            'elegivel' => $motivos === [],
            'motivos_inelegibilidade' => $motivos,
            'observacoes' => $m->observacoes,
        ];
    }

    /** @return array<string, mixed> */
    public function veiculo(Veiculo $v): array
    {
        $motivos = $v->motivosIrregularidade();
        $validade = $v->validadeDaVistoria();

        return [
            'id' => $v->id,
            'origem' => $v->origem,
            'origem_rotulo' => $v->origemEnum()->label(),
            'empresa' => $v->empresa !== null ? ['id' => $v->empresa->id, 'nome' => $v->empresa->nome()] : null,
            'motorista_padrao' => $v->motoristaPadrao !== null ? ['id' => $v->motoristaPadrao->id, 'nome' => $v->motoristaPadrao->nome()] : null,
            'descricao' => $v->descricao,
            'placa' => $v->placa,
            'renavam' => $v->renavam,
            'chassi' => $v->chassi,
            'marca_modelo' => $v->marca_modelo,
            'ano_fabricacao' => $v->ano_fabricacao,
            'ano_modelo' => $v->ano_modelo,
            'data_licenca' => $v->data_licenca?->toDateString(),
            'capacidade' => $v->capacidade,
            'tipo_rede' => $v->tipo_rede,
            'tipologia_inep' => $v->tipologia_inep,
            'tipologia_rotulo' => Tipologias::ROTULOS[$v->tipologia_inep] ?? null,
            'uso_exclusivo' => $v->uso_exclusivo,
            'acessivel' => $v->acessivel,
            'ativo' => $v->ativo,
            'motivo_inativacao' => $v->motivo_inativacao,
            'vistoria_validade' => $validade?->toDateString(),
            'regular' => $motivos === [],
            'motivos_irregularidade' => $motivos,
            'observacoes' => $v->observacoes,
        ];
    }

    /** @return array<string, mixed> */
    public function vistoria(Vistoria $v): array
    {
        return [
            'id' => $v->id,
            'veiculo_id' => $v->veiculo_id,
            'data_vistoria' => $v->data_vistoria->toDateString(),
            'certificado' => $v->certificado,
            'validade' => $v->validade->toDateString(),
            'vigente' => $v->validade->gte(today()),
            'observacoes' => $v->observacoes,
        ];
    }
}
