<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Portfolio\Models\Imagem;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\EscopoPortfolio;
use Modules\Portfolio\Support\Avaliacao;

/** @mixin Trabalho */
final class TrabalhoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Trabalho $t */
        $t = $this->resource;
        $user = $request->user();

        return [
            'id' => $t->id,
            'aluno_id' => $t->aluno_id,
            'turma' => ['id' => $t->turma_id, 'nome' => $t->turma?->nome],
            'materia' => ['id' => $t->materia_id, 'nome' => $t->materia?->nome],
            'ano_letivo' => $t->ano_letivo,
            'trimestre' => $t->trimestre,
            'titulo' => $t->titulo,
            'descricao' => $t->descricao,
            'observacoes' => $t->observacoes,
            'data' => $t->data->toDateString(),
            'avaliacao' => Avaliacao::numero($t->avaliacao_decimos),
            'autor' => ['id' => $t->registrado_por, 'nome' => $t->autor?->name],
            'imagens' => $t->imagens->map(fn (Imagem $i): array => [
                'id' => $i->id,
                'nome' => $i->nome_original,
                'url' => "/portfolio/trabalhos/{$t->id}/imagens/{$i->id}",
            ])->values()->all(),
            'pode_editar' => $user !== null && EscopoPortfolio::daRequisicao()->podeLancar($user, $t->turma_id, $t->materia_id),
            'created_at' => $t->created_at?->toISOString(),
        ];
    }
}
