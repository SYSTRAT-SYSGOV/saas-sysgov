<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EntidadeDocumento;

/** Formato JSON da entidade. O CPF do representante só sai mascarado. */
final class FormataEntidade
{
    /** @return array<string, mixed> */
    public static function resumo(Entidade $e): array
    {
        return [
            'id' => $e->id,
            'razao_social' => $e->razao_social,
            'nome_fantasia' => $e->nome_fantasia,
            'cnpj' => $e->cnpj,
            'email' => $e->email,
            'representante_legal' => $e->getAttribute('representante_legal'),
            'cidade' => $e->getAttribute('cidade'),
            'uf' => $e->getAttribute('uf'),
            'status' => $e->status->value,
            'status_rotulo' => $e->status->rotulo(),
            'lotes_ganhos' => $e->lotes_ganhos,
            'created_at' => $e->getAttribute('created_at')?->toIso8601String(),
        ];
    }

    /**
     * @param list<array{chave: string, nome: string, obrigatorio: bool}> $exigidos
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    public static function completo(Entidade $e, array $exigidos, array $extra = []): array
    {
        $e->loadMissing('documentos');
        $nomes = array_column($exigidos, 'nome', 'chave');
        $campos = ['inscricao_estadual', 'inscricao_municipal', 'endereco', 'cep', 'telefone', 'celular', 'rg_representante', 'cargo_representante',
            'tempo_funcionamento_anos', 'area_atuacao', 'finalidade', 'numero_beneficiarios', 'certificacoes', 'banco', 'agencia', 'conta', 'chave_pix', 'motivo_reprovacao'];

        return [
            ...self::resumo($e),
            ...$e->only($campos),
            'cpf_representante_mascarado' => $e->cpfMascarado(),
            'documentos_exigidos' => $exigidos,
            'documentos' => $e->documentos->sortByDesc('id')->values()->map(fn (EntidadeDocumento $d): array => [
                'id' => $d->id, 'tipo' => $d->tipo, 'nome' => $nomes[$d->tipo] ?? $d->tipo, 'mime' => $d->mime,
                'data_envio' => $d->data_envio->format('Y-m-d'), 'validade' => $d->validade?->format('Y-m-d'),
                'situacao' => $d->situacao, 'observacao_prefeitura' => $d->observacao_prefeitura,
            ])->all(),
            ...$extra,
        ];
    }
}
