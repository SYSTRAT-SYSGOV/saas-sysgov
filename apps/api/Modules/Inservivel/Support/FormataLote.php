<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\LoteDocumento;

/** Formato JSON do lote e o cálculo do valor do lote na consulta (D4: não é gravado). */
final class FormataLote
{
    /**
     * Acrescenta `valor_cents` (avaliado, ou contábil quando o avaliado é zero) e `bens_count` à consulta.
     *
     * @param Builder<Lote> $consulta
     * @return Builder<Lote>
     */
    public static function comTotais(Builder $consulta): Builder
    {
        $valor = DB::table('inservivel_lote_bens as lb')
            ->join('inservivel_bens as b', 'b.id', '=', 'lb.bem_id')
            ->whereColumn('lb.lote_id', 'inservivel_lotes.id')
            ->selectRaw('COALESCE(SUM(CASE WHEN b.valor_avaliado_cents > 0 THEN b.valor_avaliado_cents ELSE b.valor_contabil_cents END), 0)');

        return $consulta->select('inservivel_lotes.*')->selectSub($valor, 'valor_cents')->withCount('bens');
    }

    /** @return array<string, mixed> */
    public static function card(Lote $l): array
    {
        return [
            'id' => $l->id,
            'numero' => $l->numero,
            'descricao' => $l->getAttribute('descricao'),
            'data_criacao' => $l->getAttribute('data_criacao')?->format('Y-m-d'),
            'data_sorteio_prevista' => $l->getAttribute('data_sorteio_prevista')?->toIso8601String(),
            'responsavel' => $l->getAttribute('responsavel'),
            'status' => $l->status->value,
            'status_rotulo' => $l->status->rotulo(),
            'valor_cents' => (int) $l->getAttribute('valor_cents'),
            'bens_count' => (int) $l->getAttribute('bens_count'),
            'criado_por' => $l->criado_por,
            'created_at' => $l->getAttribute('created_at')?->toIso8601String(),
        ];
    }

    /**
     * @param array<string, mixed> $extra (inscrições, sorteio e permissões, montados no controller)
     * @return array<string, mixed>
     */
    public static function completo(Lote $l, array $extra = []): array
    {
        $l->loadMissing(['bens.situacao', 'bens.estadoConservacao', 'bens.categoria', 'bens.secretaria', 'bens.setor', 'bens.fotoPrincipal', 'documentos']);

        return [
            ...self::card($l),
            'observacoes' => $l->getAttribute('observacoes'),
            'proximos_status' => array_map(fn ($s): array => ['valor' => $s->value, 'rotulo' => $s->rotulo()], $l->status->proximos()),
            'bens' => $l->bens->sortBy('numero_patrimonial')->values()->map(fn (Bem $b): array => FormataBem::resumo($b))->all(),
            'documentos' => $l->documentos->sortBy('id')->values()->map(fn (LoteDocumento $d): array => [
                'id' => $d->id, 'nome' => $d->nome, 'mime' => $d->mime, 'gerado_pelo_sistema' => $d->gerado_pelo_sistema,
                'created_at' => $d->getAttribute('created_at')?->toIso8601String(),
            ])->all(),
            ...$extra,
        ];
    }
}
