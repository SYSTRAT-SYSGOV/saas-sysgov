<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\BemFoto;
use Modules\Inservivel\Models\Lote;
use Modules\OrgChart\Models\OrgUnit;

/** Formato JSON do bem nas respostas da API (valores em centavos; o front formata). */
final class FormataBem
{
    /** @return array<string, mixed> */
    public static function resumo(Bem $b): array
    {
        return [
            'id' => $b->id,
            'numero_patrimonial' => $b->numero_patrimonial,
            'plaqueta_antiga' => $b->getAttribute('plaqueta_antiga'),
            'descricao' => $b->getAttribute('descricao'),
            'marca' => $b->getAttribute('marca'),
            'modelo' => $b->getAttribute('modelo'),
            'situacao' => ['id' => $b->situacao->id, 'nome' => $b->situacao->nome, 'papel' => $b->situacao->papel?->value],
            'estado_conservacao' => $b->estadoConservacao === null ? null : ['id' => $b->estadoConservacao->id, 'nome' => $b->estadoConservacao->getAttribute('nome')],
            'categoria' => $b->categoria === null ? null : ['id' => $b->categoria->id, 'nome' => $b->categoria->getAttribute('nome')],
            'secretaria' => self::unidade($b->secretaria),
            'setor' => self::unidade($b->setor),
            'valor_contabil_cents' => $b->valor_contabil_cents,
            'valor_avaliado_cents' => $b->valor_avaliado_cents,
            'valor_referencia_cents' => $b->valorReferenciaCents(),
            'foto_principal_id' => $b->fotoPrincipal?->id,
            'created_at' => $b->getAttribute('created_at')?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function completo(Bem $b): array
    {
        $b->loadMissing(['situacao', 'estadoConservacao', 'categoria', 'secretaria', 'setor', 'fotoPrincipal', 'fotos', 'lotes']);

        return [
            ...self::resumo($b),
            'numero_serie' => $b->getAttribute('numero_serie'),
            'data_aquisicao' => $b->getAttribute('data_aquisicao')?->format('Y-m-d'),
            'data_incorporacao' => $b->getAttribute('data_incorporacao')?->format('Y-m-d'),
            'observacoes' => $b->getAttribute('observacoes'),
            'fotos' => $b->fotos->sortByDesc('principal')->values()->map(fn (BemFoto $f): array => self::foto($f))->all(),
            'lotes' => $b->lotes->sortByDesc('id')->values()->map(fn (Lote $l): array => [
                'id' => $l->id, 'numero' => $l->numero, 'status' => $l->status->value, 'status_rotulo' => $l->status->rotulo(),
            ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    public static function foto(BemFoto $f): array
    {
        return ['id' => $f->id, 'principal' => $f->principal, 'mime' => $f->mime];
    }

    /** @return array{id: int, nome: string, sigla: string|null}|null */
    public static function unidade(?OrgUnit $u): ?array
    {
        return $u === null ? null : ['id' => $u->id, 'nome' => $u->name, 'sigla' => $u->acronym];
    }
}
