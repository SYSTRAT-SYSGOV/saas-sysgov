<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoHistorico;

final class SucessaoHistoricoController extends Controller
{
    use AutorizaPermissao;

    public function index(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $processo = Sucessao::findOrFail($id);

        $historico = SucessaoHistorico::where('sucessao_id', $processo->getKey())
            ->with('usuario:id,name')
            ->orderBy('created_at')
            ->get();

        return response()->json($historico);
    }
}