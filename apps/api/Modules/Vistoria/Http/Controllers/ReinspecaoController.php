<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Vistoria\Http\Requests\ConstatarRegularizacaoRequest;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\ReinspecaoService;

final class ReinspecaoController extends Controller
{
    public function __construct(
        private readonly ReinspecaoService $service,
    ) {}

    public function show(int $id): JsonResponse
    {
        $reinspecao = Reinspecao::findOrFail($id);
        $this->authorize('view', $reinspecao);

        return response()->json($reinspecao);
    }

    public function regularizacao(ConstatarRegularizacaoRequest $request, int $id): JsonResponse
    {
        $reinspecao = Reinspecao::findOrFail($id);

        try {
            return response()->json($this->service->constatarRegularizacao(
                $reinspecao,
                (bool) $request->validated('regularizado'),
                $request->validated('observacao'),
            ));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
