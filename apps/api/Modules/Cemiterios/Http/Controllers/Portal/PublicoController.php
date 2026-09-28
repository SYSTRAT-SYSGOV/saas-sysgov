<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Geometria;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\GisService;

/**
 * Portal público, sem login (spec: portal; RF-25, RF-26; CA-03). Respostas em
 * lista branca: nunca CPF, causa da morte, documentos, estado do jazigo ou
 * dados de concessão.
 */
final class PublicoController extends Controller
{
    /** White-label do município para as telas públicas (nunca hard-coded no front). */
    public function identidade(TenantContext $tenant): JsonResponse
    {
        $t = $tenant->get();
        $s = (array) ($t->settings ?? []);

        return response()->json([
            'nome' => $t->name,
            'customPrimaryColor' => $s['customPrimaryColor'] ?? null,
            'customLogoUrl' => $s['customLogoUrl'] ?? null,
            'portalTitle' => $s['portalTitle'] ?? null,
            'portalSubtitle' => $s['portalSubtitle'] ?? null,
            'hideProviderSignature' => (bool) ($s['hideProviderSignature'] ?? false),
        ]);
    }

    public function busca(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'q' => ['required', 'string', 'min:3', 'max:100'],
            'ano' => ['nullable', 'integer', 'min:1800', 'max:2100'],
            'cemiterio' => ['nullable', 'string', 'max:30'],
        ]);
        $termo = Falecido::normalizar($dados['q']);

        $consulta = Falecido::query()
            ->whereHas('inumacoes', fn ($q) => $q->where('situacao', 'confirmada')
                ->when($dados['cemiterio'] ?? null, fn ($i, $c) => $i->whereHas('jazigo.cemiterio', fn ($p) => $p->where('codigo', $c))))
            ->when($dados['ano'] ?? null, fn ($q, $ano) => $q->whereYear('falecimento', $ano))
            ->with(['inumacoes' => fn ($q) => $q->where('situacao', 'confirmada')->with('jazigo:id,codigo,park_id,sector_id', 'jazigo.cemiterio:id,codigo,nome', 'jazigo.setor:id,codigo')]);

        if (DB::getDriverName() === 'mysql') {
            // FULLTEXT ngram: tolera acentos (nome normalizado) e pequenos erros de digitação (D14).
            $consulta->whereRaw('MATCH(nome_normalizado) AGAINST (? IN NATURAL LANGUAGE MODE)', [$termo])
                ->orderByRaw('MATCH(nome_normalizado) AGAINST (? IN NATURAL LANGUAGE MODE) DESC', [$termo]);
        } else {
            foreach (explode(' ', $termo) as $palavra) {
                $consulta->where('nome_normalizado', 'like', "%{$palavra}%");
            }
            $consulta->orderBy('nome');
        }

        $pagina = $consulta->paginate(20, ['id', 'nome', 'nascimento', 'falecimento']);

        return response()->json([
            'data' => collect($pagina->items())->map(fn (Falecido $f) => $this->resultado($f))->values(),
            'meta' => ['pagina' => $pagina->currentPage(), 'ultima_pagina' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** "Ver no Mapa": jazigo destacado e rota até o cemitério (RF-26, UC-03). */
    public function mapa(Request $request, string $codigo, GisService $gis): JsonResponse
    {
        $cemiterio = (string) $request->query('cemiterio', '');
        $jazigo = Jazigo::with(['cemiterio:id,codigo,nome,endereco,lat,lng', 'setor:id,codigo'])
            ->where('codigo', $codigo)
            ->when($cemiterio !== '', fn ($q) => $q->whereHas('cemiterio', fn ($p) => $p->where('codigo', $cemiterio)))
            ->whereHas('inumacoes', fn ($q) => $q->where('situacao', 'confirmada'))
            ->firstOrFail();

        $parque = $jazigo->cemiterio;
        $destino = $parque->lat !== null ? [$parque->lat, $parque->lng] : [$jazigo->lat, $jazigo->lng];
        $geometria = fn (string $tipo, int $id) => Geometria::where('geometriavel_type', $tipo)->where('geometriavel_id', $id)->value('geojson');

        return response()->json([
            'jazigo' => ['codigo' => $jazigo->codigo, 'setor' => $jazigo->setor?->codigo, 'centro' => [$jazigo->lat, $jazigo->lng], 'geometria' => $geometria('jazigo', $jazigo->id)],
            'cemiterio' => ['nome' => $parque->nome, 'endereco' => $parque->endereco, 'centro' => [$parque->lat, $parque->lng], 'geometria' => $geometria('parque', $parque->id)],
            'como_chegar' => $destino[0] !== null ? "https://www.google.com/maps/dir/?api=1&destination={$destino[0]},{$destino[1]}" : null,
            'mapa_base' => $gis->sessaoMapaBase(),
        ]);
    }

    /** @return array<string, mixed> */
    private function resultado(Falecido $falecido): array
    {
        /** @var Inumacao|null $inumacao */
        $inumacao = $falecido->inumacoes->sortByDesc('sepultado_em')->first();
        $jazigo = $inumacao?->jazigo;

        return [
            'nome' => $falecido->nome,
            'nascimento' => $falecido->nascimento?->toDateString(),
            'falecimento' => $falecido->falecimento->toDateString(),
            'cemiterio' => $jazigo?->cemiterio?->nome,
            'cemiterio_codigo' => $jazigo?->cemiterio?->codigo,
            'setor' => $jazigo?->setor?->codigo,
            'jazigo' => $jazigo?->codigo,
        ];
    }
}
