<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\CensoLeiaute;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ImportacaoCensoService;
use Modules\Transporte\Services\LeiauteImportacaoService;
use Symfony\Component\HttpFoundation\Response;

/**
 * Teste do leiaute e prévia da importação do Educacenso. A confirmação, a consulta e o cancelamento usam as rotas
 * `importacoes/{importacao}` das demais importações.
 */
final class CensoImportacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public const MAX_KB = 51200;

    public function __construct(
        private readonly ImportacaoCensoService $service,
        private readonly LeiauteImportacaoService $leiautes,
        private readonly TransportePolicy $policy,
    ) {}

    public function testar(Request $request): Response
    {
        abort_unless($this->policy->importarCenso($request->user()), 403);
        $leiaute = $this->leiaute($request);

        return $this->executar(fn () => response()->json(['data' => $this->service->testar($request->file('arquivo'), $leiaute)]));
    }

    public function previa(Request $request): Response
    {
        abort_unless($this->policy->importarCenso($request->user()), 403);
        $leiaute = $this->leiaute($request);

        return $this->executar(fn () => response()->json(['data' => ImportacaoController::resumir($this->service->previa($request->file('arquivo'), $leiaute, $request->user()?->id))], 201));
    }

    private function leiaute(Request $request): CensoLeiaute
    {
        $dados = $request->validate([
            'arquivo' => ['required', 'file', 'max:' . self::MAX_KB],
            'leiaute_id' => ['nullable', 'integer'],
        ]);

        return isset($dados['leiaute_id']) ? CensoLeiaute::query()->findOrFail($dados['leiaute_id']) : $this->leiautes->garantirPadrao();
    }
}
