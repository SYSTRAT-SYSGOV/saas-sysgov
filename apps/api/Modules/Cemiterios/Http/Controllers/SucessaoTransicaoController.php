<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\TransicaoSucessaoRequest;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\EstadoSucessao;

final class SucessaoTransicaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function store(TransicaoSucessaoRequest $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.transition');

        $processo = Sucessao::findOrFail($id);
        $dados = $request->validated();

        $para = EstadoSucessao::tryFrom($dados['para']) ?? throw new \InvalidArgumentException('Estado inválido');
        $motivo = $dados['motivo'];
        $lockVersion = $dados['lock_version'];

        $processo = $this->sucessao->transicionar($processo, $para, $motivo, $lockVersion);

        return response()->json($processo->load(['concessao', 'herdeiros', 'documentos', 'historico']));
    }
}