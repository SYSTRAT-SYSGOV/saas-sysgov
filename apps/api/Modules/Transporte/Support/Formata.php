<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Enums\MediacaoDidatica;
use Modules\Transporte\Enums\PoderPublico;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\Fornecedor;
use Modules\Transporte\Models\ManutencaoPrevista;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaParada;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Services\OcupacaoService;
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
            'km_atual' => $v->km_atual,
            'km_atualizado_em' => $v->km_atualizado_em?->toIso8601String(),
            'em_manutencao' => array_key_exists('em_manutencao', $v->getAttributes()) ? (bool) $v->getAttribute('em_manutencao') : $v->ordens()->where('status', 'aberta')->exists(),
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

    /** @return array<string, mixed> */
    public function parada(Parada $p): array
    {
        return [
            'id' => $p->id,
            'nome' => $p->nome,
            'descricao' => $p->descricao,
            'latitude' => $p->latitude !== null ? (float) $p->latitude : null,
            'longitude' => $p->longitude !== null ? (float) $p->longitude : null,
            'tem_coordenadas' => $p->temCoordenadas(),
            'cep' => $p->cep,
            'logradouro' => $p->logradouro,
            'numero' => $p->numero,
            'complemento' => $p->complemento,
            'bairro' => $p->bairro,
            'cidade' => $p->cidade,
            'uf' => $p->uf,
            'referencia' => $p->referencia,
            'ativa' => $p->ativa,
        ];
    }

    /** @return array<string, mixed> */
    public function rota(Rota $r): array
    {
        $motivos = $r->motivosIrregularidade();

        return [
            'id' => $r->id,
            'nome' => $r->nome,
            'escola' => $r->escola !== null ? ['id' => $r->escola->id, 'nome' => $r->escola->nome] : null,
            'ano_letivo' => $r->ano_letivo,
            'turno' => $r->turno,
            'turno_rotulo' => $r->turnoEnum()->label(),
            'tipo_rede' => $r->tipo_rede,
            'empresa' => $r->empresa !== null ? ['id' => $r->empresa->id, 'nome' => $r->empresa->nome()] : null,
            'veiculo' => $r->veiculo !== null ? ['id' => $r->veiculo->id, 'placa' => $r->veiculo->placa, 'descricao' => $r->veiculo->descricao] : null,
            'motorista' => $r->motorista !== null ? ['id' => $r->motorista->id, 'nome' => $r->motorista->nome()] : null,
            'km_pavimentado' => (float) $r->km_pavimentado,
            'km_nao_pavimentado' => (float) $r->km_nao_pavimentado,
            'km_total' => $r->kmTotal(),
            'horario_saida' => self::hora($r->horario_saida),
            'horario_chegada' => self::hora($r->horario_chegada),
            'horario_retorno' => self::hora($r->horario_retorno),
            'ativa' => $r->ativa,
            'paradas_count' => $r->getAttribute('itinerario_count'),
            'ocupacao' => OcupacaoService::calcular((int) $r->getAttribute('alocacoes_ativas_count'), $r->veiculo?->capacidade),
            'regular' => $motivos === [],
            'motivos_irregularidade' => $motivos,
            'observacoes' => $r->observacoes,
            'caracteristicas' => $r->caracteristicas ?? [],
            'custo_contratado_mensal' => $r->custo_contratado_mensal !== null ? (float) $r->custo_contratado_mensal : null,
        ];
    }

    /** @return array<string, mixed> */
    public function itinerario(RotaParada $i): array
    {
        return [
            'ordem' => $i->ordem,
            'embarque_previsto' => self::hora($i->embarque_previsto),
            'desembarque_previsto' => self::hora($i->desembarque_previsto),
            'parada' => $this->parada($i->parada),
        ];
    }

    /**
     * Alocação sem a observação da necessidade especial (D22: só a ficha, para quem gerencia).
     *
     * @param array<int, string> $escolas nomes das escolas por id
     * @return array<string, mixed>
     */
    public function alocacao(Alocacao $a, array $escolas = []): array
    {
        $aluno = $a->aluno;
        $poder = $a->poder_publico !== null ? PoderPublico::tryFrom($a->poder_publico) : null;

        return [
            'id' => $a->id,
            'rota_id' => $a->rota_id,
            'aluno' => $aluno !== null ? [
                'id' => $aluno->id,
                'nome' => $aluno->nome,
                'escola' => $escolas[$aluno->escola_id] ?? null,
                'turma' => $aluno->turma?->nome,
                'turno_turma' => $aluno->turma?->turno?->nome,
            ] : null,
            'parada' => $a->parada !== null ? ['id' => $a->parada->id, 'nome' => $a->parada->nome] : null,
            'turno' => $a->turno,
            'usa_transporte_rural' => $a->usa_transporte_rural,
            'poder_publico' => $a->poder_publico,
            'poder_publico_rotulo' => $poder?->label(),
            'necessidade_especial' => $a->necessidade_especial,
            'atendimento_curricular' => $a->atendimento_curricular,
            'mediacao_didatica' => $a->mediacao_didatica,
            'mediacao_didatica_rotulo' => MediacaoDidatica::tryFrom($a->mediacao_didatica)?->label(),
            'pais_residencia' => $a->pais_residencia,
            'data_inicio' => $a->data_inicio->toDateString(),
            'data_fim' => $a->data_fim?->toDateString(),
            'motivo_fim' => $a->motivo_fim,
            'justificativa_excesso' => $a->justificativa_excesso,
            'observacoes' => $a->observacoes,
            'ativa' => $a->ativa(),
            'avisos' => $a->avisos(),
        ];
    }

    /** `HH:MM` (o banco devolve `HH:MM:SS`). */
    private static function hora(?string $valor): ?string
    {
        return $valor === null ? null : substr($valor, 0, 5);
    }

    /** @return array<string, mixed> */
    public function fornecedor(Fornecedor $f): array
    {
        $pessoa = $f->pessoa;

        return [
            'id' => $f->id, 'pessoa_id' => $f->pessoa_id, 'nome' => $f->nome(), 'nome_fantasia' => $pessoa?->nome_fantasia,
            'cnpj_mascarado' => $pessoa?->documento_mascarado, 'ramos' => $f->ramos,
            'ramos_rotulos' => array_map(static fn (string $r): string => Catalogo::RAMOS[$r] ?? $r, $f->ramos),
            'contato' => $f->contato, 'ativo' => $f->ativo, 'observacoes' => $f->observacoes,
        ];
    }

    /** @return array<string, mixed> */
    public function ordemServico(OrdemServico $o): array
    {
        return [
            'id' => $o->id, 'veiculo' => $o->veiculo !== null ? ['id' => $o->veiculo->id, 'placa' => $o->veiculo->placa, 'descricao' => $o->veiculo->descricao] : null,
            'fornecedor' => $o->fornecedor !== null ? ['id' => $o->fornecedor->id, 'nome' => $o->fornecedor->nome()] : null,
            'tipo' => $o->tipo, 'tipo_rotulo' => Catalogo::TIPOS_OS[$o->tipo] ?? $o->tipo, 'descricao' => $o->descricao,
            'status' => $o->status, 'status_rotulo' => Catalogo::STATUS_OS[$o->status] ?? $o->status, 'aberta_em' => $o->aberta_em->toDateString(),
            'concluida_em' => $o->concluida_em?->toDateString(), 'km' => $o->km, 'valor' => $o->valor !== null ? (float) $o->valor : null,
            'motivo_cancelamento' => $o->motivo_cancelamento,
        ];
    }

    /** @return array<string, mixed> */
    public function manutencaoPrevista(ManutencaoPrevista $p): array
    {
        $km = $p->veiculo?->km_atual;

        return [
            'id' => $p->id, 'veiculo' => $p->veiculo !== null ? ['id' => $p->veiculo->id, 'placa' => $p->veiculo->placa, 'descricao' => $p->veiculo->descricao] : null,
            'descricao' => $p->descricao, 'data_prevista' => $p->data_prevista?->toDateString(), 'km_previsto' => $p->km_previsto,
            'km_atual' => $km, 'km_restante' => $p->km_previsto !== null && $km !== null ? $p->km_previsto - $km : null,
            'dias_restantes' => $p->data_prevista !== null ? (int) today()->diffInDays($p->data_prevista->copy()->startOfDay(), false) : null,
            'status' => $p->status, 'ordem_servico_id' => $p->ordem_servico_id,
        ];
    }
}
