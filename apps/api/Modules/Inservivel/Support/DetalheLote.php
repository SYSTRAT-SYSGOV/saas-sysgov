<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Illuminate\Support\Facades\Gate;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Services\ValidadeDocumentoService;

/**
 * Monta a tela do lote: dados, bens, documentos, inscritas (com o bloqueio por documento vencido, D15), sorteio e o
 * que o usuário pode fazer (o front só esconde botões; a autorização é do servidor).
 */
final class DetalheLote
{
    public function __construct(
        private readonly ValidadeDocumentoService $validade,
    ) {}

    /** @return array<string, mixed> */
    public function montar(Lote $lote): array
    {
        $lote = FormataLote::comTotais(Lote::query())->with('sorteio.vencedora')->whereKey($lote->id)->firstOrFail();
        $interesses = Interesse::query()->where('lote_id', $lote->id)->with('entidade')->orderBy('id')->get();
        $bloqueios = $this->validade->bloqueiosPorEntidade($interesses->pluck('entidade_id')->map(fn ($id): int => (int) $id)->all());
        $sorteio = $lote->sorteio;

        return FormataLote::completo($lote, [
            'inscricoes' => $interesses->map(fn (Interesse $i): array => [
                'entidade_id' => $i->entidade_id,
                'razao_social' => $i->entidade->razao_social,
                'cnpj' => $i->entidade->cnpj,
                'status' => $i->entidade->status->value,
                'status_rotulo' => $i->entidade->status->rotulo(),
                'lotes_ganhos' => $i->entidade->lotes_ganhos,
                'inscrita_em' => $i->getAttribute('created_at')?->toIso8601String(),
                'bloqueios' => $bloqueios[$i->entidade_id] ?? [],
            ])->all(),
            'sorteio' => $sorteio === null ? null : [
                'id' => $sorteio->id,
                'data' => $sorteio->data_sorteio->toIso8601String(),
                'regra' => $sorteio->regra,
                'semente' => $sorteio->semente,
                'hash' => $sorteio->hash,
                'participantes' => $sorteio->participantes,
                'vencedora' => ['id' => $sorteio->vencedora->id, 'razao_social' => $sorteio->vencedora->razao_social, 'cnpj' => $sorteio->vencedora->cnpj],
            ],
            'permissoes' => [
                'editar' => Gate::allows('update', $lote),
                'gerir' => Gate::allows('gerir', $lote),
            ],
        ]);
    }
}
