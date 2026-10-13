<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Escola\Models\Aluno;

/** @mixin Aluno */
final class AlunoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero,
            'nome' => $this->nome,
            // CPF nunca sai completo; ligado ao Cadastro de Pessoas quando pessoa_id não é nulo.
            'cpf_mascarado' => $this->cpf_mascarado,
            'pessoa_id' => $this->pessoa_id,
            'cgm' => $this->cgm,
            'nascimento' => $this->nascimento?->toDateString(),
            'mae' => $this->mae,
            'pai' => $this->pai,
            'situacao' => $this->situacao,
            'tem_foto' => $this->foto_path !== null,
            'turma' => $this->whenLoaded('turma', fn () => $this->turma === null ? null : [
                'id' => $this->turma->id,
                'nome' => $this->turma->nome,
                'ano_letivo' => $this->turma->ano_letivo,
                'turno' => $this->turma->relationLoaded('turno') ? $this->turma->turno?->nome : null,
            ]),
            'turma_origem' => $this->whenLoaded('turmaOrigem', fn () => $this->turmaOrigem === null ? null : [
                'id' => $this->turmaOrigem->id,
                'nome' => $this->turmaOrigem->nome,
            ]),
            'contatos' => $this->whenLoaded('contatos', fn () => $this->contatos->map(fn ($c): array => [
                'telefone' => $c->telefone,
                'descricao' => $c->descricao,
            ])->all()),
            'atualizado_em' => $this->updated_at?->toIso8601String(),
        ];
    }
}
