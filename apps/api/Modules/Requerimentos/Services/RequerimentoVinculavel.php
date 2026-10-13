<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Services;

use Modules\Protocolo\Contracts\EntidadeVinculavel;
use Modules\Requerimentos\Models\Proposicao;

final class RequerimentoVinculavel implements EntidadeVinculavel
{
    public function tipo(): string
    {
        return 'requerimento';
    }

    public function existe(int $entidadeId): bool
    {
        return Proposicao::query()->where('id', $entidadeId)->exists();
    }

    public function jaPromovida(int $entidadeId): bool
    {
        return Proposicao::query()
            ->where('id', $entidadeId)
            ->whereNotNull('vinculacao_processo_id')
            ->exists();
    }

    public function aoPromover(int $entidadeId, int $processoId): void
    {
        $proposicao = Proposicao::query()
            ->where('id', $entidadeId)
            ->lockForUpdate()
            ->firstOrFail();

        $proposicao->vinculacao_processo_id = $processoId;
        $proposicao->save();
    }

    public function resumo(int $entidadeId): array
    {
        $proposicao = Proposicao::query()->find($entidadeId);
        if ($proposicao === null) {
            return [
                'titulo' => "Requerimento #{$entidadeId}",
                'detalhes' => null,
                'status' => null,
            ];
        }

        return [
            'titulo' => "Proposição {$proposicao->numero} - {$proposicao->ementa}",
            'detalhes' => $proposicao->justificativa,
            'status' => $proposicao->status,
        ];
    }
}
