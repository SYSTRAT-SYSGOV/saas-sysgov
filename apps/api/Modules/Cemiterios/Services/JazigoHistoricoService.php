<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Collection;
use Modules\Cemiterios\Models\AlvaraObra;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Exumacao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\JazigoHistorico;
use Modules\Cemiterios\Models\Trasladacao;
use Modules\Cemiterios\Models\Vistoria;

/**
 * Linha do tempo do jazigo (RF-19): estados, concessões, inumações,
 * exumações, trasladações, vistorias e obras. Nunca inclui causa da morte.
 */
final class JazigoHistoricoService
{
    /** @return Collection<int, array{data: string, tipo: string, descricao: string}> */
    public function linhaDoTempo(Jazigo $jazigo): Collection
    {
        $id = $jazigo->id;
        $eventos = collect();

        foreach (JazigoHistorico::where('plot_id', $id)->get() as $h) {
            $eventos->push($this->evento($h->ocorrido_em, 'estado', "Estado: {$h->de} → {$h->para}" . ($h->motivo ? " ({$h->motivo})" : '')));
        }
        foreach (Concessao::where('plot_id', $id)->get() as $c) {
            $eventos->push($this->evento($c->inicio, 'concessao', "Concessão {$c->numero} ({$c->modalidade}) — {$c->situacao}"));
        }
        foreach (Inumacao::with('falecido:id,nome')->where('plot_id', $id)->get() as $i) {
            $eventos->push($this->evento($i->sepultado_em, 'inumacao', "Inumação de {$i->falecido?->nome} — {$i->situacao}"));
        }
        foreach (Exumacao::with('inumacao.falecido:id,nome')->whereHas('inumacao', fn ($q) => $q->where('plot_id', $id))->get() as $e) {
            $eventos->push($this->evento($e->created_at, 'exumacao', "Exumação {$e->tipo} de {$e->inumacao?->falecido?->nome} — {$e->situacao}"));
        }
        foreach (Trasladacao::where(fn ($q) => $q->where('plot_origem_id', $id)->orWhere('plot_destino_id', $id))->get() as $t) {
            $eventos->push($this->evento($t->created_at, 'trasladacao', "Trasladação — {$t->situacao}"));
        }
        foreach (Vistoria::where('plot_id', $id)->get() as $v) {
            $eventos->push($this->evento($v->data, 'vistoria', "Vistoria: {$v->estado_conservacao}, risco {$v->risco}"));
        }
        foreach (AlvaraObra::where('plot_id', $id)->get() as $o) {
            $eventos->push($this->evento($o->created_at, 'obra', "Alvará de obra — {$o->situacao}"));
        }

        return $eventos->sortBy('data')->values();
    }

    /** @return array{data: string, tipo: string, descricao: string} */
    private function evento(mixed $data, string $tipo, string $descricao): array
    {
        return ['data' => $data ? $data->toIso8601String() : '', 'tipo' => $tipo, 'descricao' => $descricao];
    }
}
