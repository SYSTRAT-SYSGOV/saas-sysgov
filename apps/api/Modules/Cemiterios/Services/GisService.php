<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\TenantContext;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Geometria;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * GIS do módulo (spec: gis; ADR-001, D3, D4): gravação de geometrias com
 * validação topológica em metros, camadas por caixa delimitadora com cache,
 * geração de jazigos em grade e sessão do mapa base.
 */
final readonly class GisService
{
    private const LIMITE_FEICOES = 5000;

    public function __construct(
        private ParametroService $parametros,
        private TenantContext $tenant,
    ) {}

    /** @param array<string, mixed> $geojson */
    public function salvar(string $tipo, int $id, array $geojson): Geometria
    {
        $dono = (Geometria::TIPOS[$tipo])::findOrFail($id);
        $anel = Geo::anel($geojson);
        $ref = Geo::referencia($anel);
        $metros = Geo::projetar($anel, $ref);

        if (Geo::autoIntersecta($metros)) {
            throw new RegraNegocioException('geometria.auto_intersecao', 'Polígono inválido: as arestas se cruzam.');
        }

        [$tipoPai, $idPai] = match ($tipo) {
            'setor' => ['parque', $dono->park_id],
            'jazigo' => ['setor', $dono->sector_id],
            default => [null, null],
        };
        $pai = $tipoPai ? $this->geometria($tipoPai, (int) $idPai) : null;
        if ($pai && !Geo::contem(Geo::projetar(Geo::anel($pai->geojson), $ref), $metros)) {
            throw new RegraNegocioException("geometria.fora_do_{$tipoPai}", $tipo === 'setor' ? 'O setor deve ficar dentro do cemitério.' : 'O jazigo deve ficar dentro do setor.');
        }

        if ($tipo === 'jazigo') {
            $this->validarJazigo($metros, $ref, $id);
        }

        return DB::transaction(function () use ($tipo, $id, $dono, $anel, $ref, $metros): Geometria {
            $geometria = $this->gravar($tipo, $id, $anel);
            [$lng, $lat] = Geo::desprojetar([Geo::centroide($metros)], $ref)[0];

            match ($tipo) {
                'parque' => $dono->update(['lat' => $lat, 'lng' => $lng]),
                'setor' => $dono->update(['area_m2' => round(Geo::area($metros), 2)]),
                default => $dono->update(['lat' => $lat, 'lng' => $lng] + $this->dimensoes($metros)),
            };

            self::invalidar($this->tenant->id());

            return $geometria;
        });
    }

    /**
     * Grade de jazigos dentro do setor (RN-07/RN-08 por construção). Só entram
     * os retângulos inteiramente contidos e sem conflito com jazigos existentes.
     *
     * @param array{origem: array{0: float, 1: float}, direcao: array{0: float, 1: float}, linhas: int, colunas: int, comprimento_m: float, largura_m: float, espacamento_m: float, padrao: string, tipo: string, capacidade: int} $d
     * @return array{criados: int, descartados: list<array{linha: int, coluna: int, motivo: string}>, duplicados: list<string>}
     */
    public function gerarGrade(Setor $setor, array $d): array
    {
        $p = $this->parametros->vigente();
        if ($d['espacamento_m'] < $p->distanciamento_min_m) {
            throw new RegraNegocioException('grade.espacamento_minimo', "Espaçamento de {$d['espacamento_m']} m abaixo do mínimo de {$p->distanciamento_min_m} m.", ['minimo_m' => $p->distanciamento_min_m]);
        }
        $this->exigirDimensoes(max($d['comprimento_m'], $d['largura_m']), min($d['comprimento_m'], $d['largura_m']));

        $geoSetor = $this->geometria('setor', $setor->id)
            ?? throw new RegraNegocioException('grade.setor_sem_geometria', 'Desenhe o polígono do setor antes de gerar a grade.');

        $ref = $d['origem'];
        $setorM = Geo::projetar(Geo::anel($geoSetor->geojson), $ref);
        [$dir] = Geo::projetar([$d['direcao']], $ref);
        $norma = hypot($dir[0], $dir[1]);
        if ($norma < 0.01) {
            throw new RegraNegocioException('grade.orientacao_invalida', 'A orientação exige dois pontos distintos.');
        }
        $u = [$dir[0] / $norma, $dir[1] / $norma];
        $v = [-$u[1], $u[0]];
        $c = Geo::centroide($setorM);
        if ($c[0] * $v[0] + $c[1] * $v[1] < 0) {
            $v = [-$v[0], -$v[1]]; // as linhas crescem para dentro do setor
        }

        $vizinhos = Geometria::where('geometriavel_type', 'jazigo')
            ->whereIn('geometriavel_id', Jazigo::where('sector_id', $setor->id)->select('id'))
            ->get()->map(fn (Geometria $g) => Geo::projetar(Geo::anel($g->geojson), $ref))->all();
        $existentes = Jazigo::where('park_id', $setor->park_id)->pluck('codigo')->flip()->all();

        $novos = $descartados = $duplicados = [];
        $n = 0;
        for ($linha = 1; $linha <= $d['linhas']; $linha++) {
            for ($coluna = 1; $coluna <= $d['colunas']; $coluna++) {
                $n++;
                $o = [
                    ($coluna - 1) * ($d['largura_m'] + $d['espacamento_m']),
                    ($linha - 1) * ($d['comprimento_m'] + $d['espacamento_m']),
                ];
                $ret = array_map(fn ($k) => [
                    $o[0] * $u[0] + $o[1] * $v[0] + $k[0] * $u[0] + $k[1] * $v[0],
                    $o[0] * $u[1] + $o[1] * $v[1] + $k[0] * $u[1] + $k[1] * $v[1],
                ], [[0, 0], [$d['largura_m'], 0], [$d['largura_m'], $d['comprimento_m']], [0, $d['comprimento_m']]]);

                $codigo = strtr($d['padrao'], [
                    '{linha}' => str_pad((string) $linha, 2, '0', STR_PAD_LEFT),
                    '{coluna}' => str_pad((string) $coluna, 2, '0', STR_PAD_LEFT),
                    '{n}' => str_pad((string) $n, 3, '0', STR_PAD_LEFT),
                ]);

                if (isset($existentes[$codigo])) {
                    $duplicados[] = $codigo;
                } elseif (!Geo::contem($setorM, $ret)) {
                    $descartados[] = ['linha' => $linha, 'coluna' => $coluna, 'motivo' => 'fora do setor'];
                } elseif (array_filter($vizinhos, fn ($viz) => Geo::distancia($viz, $ret) < $p->distanciamento_min_m) !== []) {
                    $descartados[] = ['linha' => $linha, 'coluna' => $coluna, 'motivo' => 'conflito com jazigo existente'];
                } else {
                    $novos[] = [$codigo, $ret];
                    $existentes[$codigo] = true;
                }
            }
        }

        DB::transaction(function () use ($novos, $setor, $d, $ref): void {
            foreach ($novos as [$codigo, $ret]) {
                [$lng, $lat] = Geo::desprojetar([Geo::centroide($ret)], $ref)[0];
                $jazigo = Jazigo::create([
                    'park_id' => $setor->park_id, 'sector_id' => $setor->id, 'codigo' => $codigo,
                    'tipo' => $d['tipo'], 'capacidade' => $d['capacidade'], 'lat' => $lat, 'lng' => $lng,
                ] + $this->dimensoes($ret));
                $this->gravar('jazigo', $jazigo->id, Geo::desprojetar($ret, $ref));
            }
        });
        self::invalidar($this->tenant->id());

        return ['criados' => count($novos), 'descartados' => $descartados, 'duplicados' => $duplicados];
    }

    /**
     * Feições da camada que intersectam a caixa [minLng, minLat, maxLng, maxLat] (RF-15, RNF-07).
     *
     * @param array{0: float, 1: float, 2: float, 3: float} $bbox
     * @return array{type: string, features: list<array<string, mixed>>}
     */
    public function camada(string $tipo, array $bbox): array
    {
        $tenant = $this->tenant->id();
        $chave = sprintf('cemiterios:gis:%d:v%d:%s:%s', $tenant, (int) Cache::get("cemiterios:gis:{$tenant}:versao", 0), $tipo, implode(',', array_map(fn ($c) => round($c, 6), $bbox)));

        return Cache::remember($chave, 600, function () use ($tipo, $bbox): array {
            [$minLng, $minLat, $maxLng, $maxLat] = $bbox;
            $consulta = Geometria::where('geometriavel_type', $tipo)
                ->where('min_lng', '<=', $maxLng)->where('max_lng', '>=', $minLng)
                ->where('min_lat', '<=', $maxLat)->where('max_lat', '>=', $minLat);

            if (DB::getDriverName() === 'mysql') {
                $wkt = sprintf('POLYGON((%1$F %2$F,%3$F %2$F,%3$F %4$F,%1$F %4$F,%1$F %2$F))', $minLng, $minLat, $maxLng, $maxLat);
                $consulta->whereRaw("MBRIntersects(geom, ST_GeomFromText(?, 4326, 'axis-order=long-lat'))", [$wkt]);
            }

            $geometrias = $consulta->limit(self::LIMITE_FEICOES)->get(['geometriavel_id', 'geojson']);
            $donos = (Geometria::TIPOS[$tipo])::whereIn('id', $geometrias->pluck('geometriavel_id'))->get()->keyBy('id');

            return [
                'type' => 'FeatureCollection',
                'features' => $geometrias->filter(fn ($g) => $donos->has($g->geometriavel_id))->map(fn (Geometria $g) => [
                    'type' => 'Feature',
                    'id' => "{$tipo}-{$g->geometriavel_id}",
                    'geometry' => $g->geojson,
                    'properties' => $this->propriedades($tipo, $donos[$g->geometriavel_id]),
                ])->values()->all(),
            ];
        });
    }

    /**
     * Camada base: Google Map Tiles (sessão criada no servidor) ou Esri World Imagery (D4).
     *
     * @return array{provedor: string, url: string, atribuicao: string, max_zoom: int}
     */
    public function sessaoMapaBase(): array
    {
        if (config('cemiterios.mapa_base.provedor') !== 'google') {
            return [
                'provedor' => 'esri',
                'url' => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                'atribuicao' => 'Imagens © Esri, Maxar, Earthstar Geographics',
                'max_zoom' => 19,
            ];
        }

        $chave = (string) config('cemiterios.mapa_base.google_api_key');
        $sessao = Cache::get('cemiterios:mapa-base:google');
        if (!$sessao) {
            $resposta = Http::timeout(10)->post("https://tile.googleapis.com/v1/createSession?key={$chave}", [
                'mapType' => 'satellite', 'language' => 'pt-BR', 'region' => 'BR', 'layerTypes' => ['layerRoadmap'],
            ])->throw()->json();
            $sessao = (string) $resposta['session'];
            $validade = max(60, (int) ($resposta['expiry'] ?? time() + 7200) - time() - 3600);
            Cache::put('cemiterios:mapa-base:google', $sessao, $validade);
        }

        return [
            'provedor' => 'google',
            'url' => "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session={$sessao}&key={$chave}",
            'atribuicao' => 'Imagens © Google',
            'max_zoom' => 22,
        ];
    }

    /**
     * Envelope [minLng, minLat, maxLng, maxLat] para o zoom da busca.
     *
     * @return list<float>|null
     */
    public function envelope(Jazigo $jazigo): ?array
    {
        $g = $this->geometria('jazigo', $jazigo->id);
        if ($g) {
            return [$g->min_lng, $g->min_lat, $g->max_lng, $g->max_lat];
        }

        return $jazigo->lat !== null ? [$jazigo->lng, $jazigo->lat, $jazigo->lng, $jazigo->lat] : null;
    }

    public static function invalidar(int $tenantId): void
    {
        $chave = "cemiterios:gis:{$tenantId}:versao";
        Cache::forever($chave, (int) Cache::get($chave, 0) + 1);
    }

    private function geometria(string $tipo, int $id): ?Geometria
    {
        return Geometria::where('geometriavel_type', $tipo)->where('geometriavel_id', $id)->first();
    }

    /** @param list<array{0: float, 1: float}> $anel [lng, lat] */
    private function gravar(string $tipo, int $id, array $anel): Geometria
    {
        $geojson = Geo::geojson($anel);
        $valores = ['geojson' => $geojson] + Geo::caixa($anel);
        if (DB::getDriverName() === 'mysql') {
            // JSON gerado aqui (só números) — seguro para literal SQL.
            $valores['geom'] = DB::raw("ST_GeomFromGeoJSON('" . json_encode($geojson) . "', 1, 4326)");
        }

        return Geometria::updateOrCreate(['geometriavel_type' => $tipo, 'geometriavel_id' => $id], $valores);
    }

    /**
     * @param list<array{0: float, 1: float}> $metros
     * @param array{0: float, 1: float} $ref
     */
    private function validarJazigo(array $metros, array $ref, int $id): void
    {
        ['comprimento' => $comprimento, 'largura' => $largura] = Geo::dimensoes($metros);
        $this->exigirDimensoes($comprimento, $largura);

        $minimo = $this->parametros->vigente()->distanciamento_min_m;
        $caixa = Geo::caixa(Geo::desprojetar($metros, $ref));
        $margem = ($minimo + 1) / 111_000; // graus, com folga

        $vizinhos = Geometria::where('geometriavel_type', 'jazigo')->where('geometriavel_id', '!=', $id)
            ->where('min_lng', '<=', $caixa['max_lng'] + $margem * 2)->where('max_lng', '>=', $caixa['min_lng'] - $margem * 2)
            ->where('min_lat', '<=', $caixa['max_lat'] + $margem)->where('max_lat', '>=', $caixa['min_lat'] - $margem)
            ->get();

        foreach ($vizinhos as $vizinho) {
            $outro = Geo::projetar(Geo::anel($vizinho->geojson), $ref);
            if (Geo::sobrepoe($outro, $metros)) {
                throw new RegraNegocioException('jazigo.sobreposicao', 'O jazigo se sobrepõe a outro jazigo.', ['vizinho_id' => $vizinho->geometriavel_id]);
            }
            $distancia = Geo::distancia($outro, $metros);
            if ($distancia < $minimo) {
                throw new RegraNegocioException(
                    'jazigo.distanciamento',
                    sprintf('Distância de %.2f m até o jazigo vizinho; o mínimo é %.2f m.', $distancia, $minimo),
                    ['distancia_m' => round($distancia, 2), 'minimo_m' => $minimo, 'vizinho_id' => $vizinho->geometriavel_id],
                );
            }
        }
    }

    private function exigirDimensoes(float $comprimento, float $largura): void
    {
        $p = $this->parametros->vigente();
        if ($comprimento > $p->tumulo_max_comprimento_m + 0.005 || $largura > $p->tumulo_max_largura_m + 0.005) {
            throw new RegraNegocioException(
                'jazigo.dimensao_excedida',
                sprintf('Dimensão %.2f m × %.2f m excede o máximo de %.2f m × %.2f m.', $comprimento, $largura, $p->tumulo_max_comprimento_m, $p->tumulo_max_largura_m),
                ['comprimento_m' => round($comprimento, 2), 'largura_m' => round($largura, 2), 'max_comprimento_m' => $p->tumulo_max_comprimento_m, 'max_largura_m' => $p->tumulo_max_largura_m],
            );
        }
    }

    /**
     * @param list<array{0: float, 1: float}> $metros
     * @return array{comprimento_m: float, largura_m: float}
     */
    private function dimensoes(array $metros): array
    {
        $d = Geo::dimensoes($metros);

        return ['comprimento_m' => round($d['comprimento'], 2), 'largura_m' => round($d['largura'], 2)];
    }

    /** @return array<string, mixed> */
    private function propriedades(string $tipo, Cemiterio|Setor|Jazigo $dono): array
    {
        return match ($tipo) {
            'parque' => ['id' => $dono->id, 'codigo' => $dono->codigo, 'nome' => $dono->nome],
            'setor' => ['id' => $dono->id, 'codigo' => $dono->codigo, 'tipo_zona' => $dono->tipo_zona, 'area_m2' => $dono->area_m2],
            default => [
                'id' => $dono->id, 'codigo' => $dono->codigo, 'estado' => $dono->estado->value, 'tipo' => $dono->tipo,
                'ocupacao' => $dono->ocupacao, 'capacidade' => $dono->capacidade, 'lock_version' => $dono->lock_version,
            ],
        };
    }
}
