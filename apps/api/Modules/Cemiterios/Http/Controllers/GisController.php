<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Support\Documento;

/** Mapa, geometrias, grade e busca unificada (spec: gis; RF-15..RF-18). */
final class GisController extends Controller
{
    use AutorizaPermissao;

    private const CAMADAS = ['parques' => 'parque', 'setores' => 'setor', 'jazigos' => 'jazigo'];

    public function __construct(
        private readonly GisService $gis,
        private readonly AuditLogger $audit,
    ) {}

    public function camadas(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $dados = $request->validate([
            'camada' => ['required', Rule::in(array_keys(self::CAMADAS))],
            'bbox' => ['required', 'string', 'regex:/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/'],
        ]);
        $bbox = array_map('floatval', explode(',', $dados['bbox']));
        abort_if($bbox[0] > $bbox[2] || $bbox[1] > $bbox[3], 422, 'bbox deve ser minLng,minLat,maxLng,maxLat.');

        return response()->json($this->gis->camada(self::CAMADAS[$dados['camada']], $bbox));
    }

    public function salvarGeometria(Request $request, string $tipo, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.gis.edit');

        $dados = $request->validate(['geojson' => ['required', 'array'], 'geojson.type' => ['required', 'string'], 'geojson.coordinates' => ['required', 'array']]);
        $geometria = $this->gis->salvar($tipo, $id, $dados['geojson']);
        $this->audit->record('cemiterios', 'gis.geometria.salva', "{$tipo} #{$id}", null, ['geojson' => $geometria->geojson]);

        return response()->json($geometria);
    }

    public function gerarGrade(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $d = $request->validate([
            'origem' => ['required', 'array', 'size:2'], 'origem.*' => ['numeric'],
            'direcao' => ['required', 'array', 'size:2'], 'direcao.*' => ['numeric'],
            'linhas' => ['required', 'integer', 'min:1', 'max:100'],
            'colunas' => ['required', 'integer', 'min:1', 'max:100'],
            'comprimento_m' => ['required', 'numeric', 'gt:0'],
            'largura_m' => ['required', 'numeric', 'gt:0'],
            'espacamento_m' => ['required', 'numeric', 'min:0'],
            'padrao' => ['required', 'string', 'max:30', 'regex:/\{(n|linha|coluna)\}/'],
            'tipo' => ['required', Rule::in(Jazigo::TIPOS)],
            'capacidade' => ['required', 'integer', 'min:1', 'max:50'],
        ]);
        abort_if($d['linhas'] * $d['colunas'] > 2000, 422, 'No máximo 2.000 jazigos por geração.');

        $resultado = $this->gis->gerarGrade(Setor::findOrFail($id), [
            'origem' => array_map('floatval', $d['origem']), 'direcao' => array_map('floatval', $d['direcao']),
            'linhas' => (int) $d['linhas'], 'colunas' => (int) $d['colunas'],
            'comprimento_m' => (float) $d['comprimento_m'], 'largura_m' => (float) $d['largura_m'],
            'espacamento_m' => (float) $d['espacamento_m'], 'padrao' => $d['padrao'],
            'tipo' => $d['tipo'], 'capacidade' => (int) $d['capacidade'],
        ]);
        $this->audit->record('cemiterios', 'gis.grade.gerada', "Setor #{$id}", null, $resultado);

        return response()->json($resultado, 201);
    }

    public function sessaoMapaBase(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json($this->gis->sessaoMapaBase());
    }

    public function exportar(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->autorizar($request, 'cemiterios.view');

        $dados = $request->validate([
            'park_id' => ['required', 'integer'],
            'formato' => ['required', Rule::in(['geojson', 'kml'])],
        ]);

        $resultado = $this->gis->exportar((int) $dados['park_id'], $dados['formato']);

        if ($dados['formato'] === 'kml') {
            return response($resultado['conteudo'], 200, [
                'Content-Type' => 'application/vnd.google-earth.kml+xml; charset=utf-8',
                'Content-Disposition' => "attachment; filename=\"{$resultado['arquivo']}\"",
            ]);
        }

        return response()->json($resultado['conteudo'], 200, [
            'Content-Disposition' => "attachment; filename=\"{$resultado['arquivo']}\"",
        ]);
    }

    /**
     * Busca unificada (RF-17): falecido, código do jazigo e número da concessão;
     * CPF (exato, por hash) e nome do concessionário só com permissão de concessões.
     */
    public function buscar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q']);
        $resultados = collect();

        $jazigosDe = fn (Collection $ids) => Jazigo::whereIn('id', $ids)->get()->keyBy('id');

        $inumacoes = Inumacao::with('falecido:id,nome')
            ->where('situacao', 'confirmada')
            ->whereHas('falecido', fn ($f) => $f->where('nome_normalizado', 'like', '%' . Falecido::normalizar($q) . '%'))
            ->limit(20)->get();
        $jazigos = $jazigosDe($inumacoes->pluck('plot_id'));
        foreach ($inumacoes as $i) {
            $resultados->push($this->resultado('falecido', (string) $i->falecido?->nome, $jazigos[$i->plot_id] ?? null));
        }

        foreach (Jazigo::where('codigo', 'like', "{$q}%")->orderBy('codigo')->limit(20)->get() as $j) {
            $resultados->push($this->resultado('jazigo', $j->codigo, $j));
        }

        $concessoes = Concessao::where('numero', 'like', "{$q}%")->limit(10)->get();

        if ($request->user()->hasPermission('cemiterios.concessoes.manage')) {
            $titulares = strlen(Documento::somenteDigitos($q)) >= 11
                ? Concessionario::where('documento_hash', Documento::hash($q))->pluck('id')
                : Concessionario::where('nome', 'like', "%{$q}%")->limit(10)->pluck('id');
            $concessoes = $concessoes->merge(Concessao::whereIn('holder_id', $titulares)->with('concessionario:id,nome')->limit(20)->get());
        }

        $jazigos = $jazigosDe($concessoes->pluck('plot_id'));
        foreach ($concessoes->unique('id') as $c) {
            $resultados->push($this->resultado('concessao', "Concessão {$c->numero}" . ($c->concessionario ? " — {$c->concessionario->nome}" : ''), $jazigos[$c->plot_id] ?? null));
        }

        return response()->json($resultados->filter(fn ($r) => $r['jazigo_id'] !== null)->values());
    }

    /** @return array{tipo: string, rotulo: string, jazigo_id: int|null, jazigo_codigo: string|null, envelope: list<float>|null} */
    private function resultado(string $tipo, string $rotulo, ?Jazigo $jazigo): array
    {
        return [
            'tipo' => $tipo,
            'rotulo' => $rotulo,
            'jazigo_id' => $jazigo?->id,
            'jazigo_codigo' => $jazigo?->codigo,
            'envelope' => $jazigo ? $this->gis->envelope($jazigo) : null,
        ];
    }
}
