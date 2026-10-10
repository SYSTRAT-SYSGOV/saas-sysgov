<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Referencia\RefImportacao;
use Modules\Campanha\Models\Referencia\RefMalha;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Services\Referencia\UnidadesFederativas;

/** Base territorial pública (IBGE/TSE) — só leitura para os tenants (D3). */
final class ReferenciaController extends Controller
{
    public function municipios(string $uf): JsonResponse
    {
        $this->authorize('viewAny', Campanha::class);
        $uf = $this->uf($uf);

        return response()->json([
            'municipios' => RefMunicipio::query()->where('uf', $uf)->orderBy('nome')->get(),
            'ultima_importacao' => RefImportacao::query()->where('uf', $uf)->latest('iniciado_em')->first(['situacao', 'iniciado_em', 'concluido_em']),
        ]);
    }

    /** GeoJSON dos municípios da UF, com ETag (o navegador guarda e revalida). */
    public function malha(Request $request, string $uf): Response
    {
        $this->authorize('viewAny', Campanha::class);
        $malha = RefMalha::query()->find($this->uf($uf));
        abort_if($malha === null, 404, 'A malha desta UF ainda não foi importada.');

        $etag = '"' . md5($malha->uf . (string) $malha->updated_at?->timestamp) . '"';
        if ($request->header('If-None-Match') === $etag) {
            return response('', 304, ['ETag' => $etag]);
        }

        return response($malha->geojson, 200, [
            'Content-Type' => 'application/geo+json',
            'ETag' => $etag,
            'Cache-Control' => 'private, no-cache',
        ]);
    }

    private function uf(string $uf): string
    {
        $uf = strtoupper($uf);
        abort_unless(isset(UnidadesFederativas::CODIGOS[$uf]), 404, 'UF inválida.');

        return $uf;
    }
}
