<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\HerdeirosSucessaoRequest;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoService;

final class SucessaoHerdeiroController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function store(HerdeirosSucessaoRequest $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $processo = Sucessao::findOrFail($id);
        $dados = $request->validated();

        $herdeiros = $this->sucessao->upsertHerdeiros($processo, $dados['herdeiros']);

        return response()->json($herdeiros, 201);
    }

    public function destroy(Request $request, int $id, int $herdeiroId): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $processo = Sucessao::findOrFail($id);

        if ($processo->estado->value !== 'em_analise') {
            return response()->json([
                'message' => 'Herdeiros só podem ser removidos com o processo em análise.'
            ], 422);
        }

        $processo->herdeiros()->whereKey($herdeiroId)->delete();

        return response()->json(['message' => 'Herdeiro removido com sucesso.']);
    }
}