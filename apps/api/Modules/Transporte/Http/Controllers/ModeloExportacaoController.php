<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\ModeloExportacao;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ModeloExportacaoService;
use Symfony\Component\HttpFoundation\Response;

final class ModeloExportacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly ModeloExportacaoService $service, private readonly TransportePolicy $policy) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);

        return response()->json(['data' => $this->service->listar()->map(fn (ModeloExportacao $m): array => $this->formatar($m))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formatar($this->service->salvar(null, $dados, $request->user()?->id))], 201));
    }

    public function update(Request $request, ModeloExportacao $modelo): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formatar($this->service->salvar($modelo, $dados, $request->user()?->id))]));
    }

    public function destroy(Request $request, ModeloExportacao $modelo): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);

        return $this->executar(function () use ($modelo): JsonResponse {
            $this->service->excluir($modelo);

            return response()->json(['excluido' => true]);
        });
    }

    /** Campos do modelo para o leiaute pedido; o que o leiaute não tem vai em `ignorados`. */
    public function aplicar(Request $request, ModeloExportacao $modelo): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);
        $leiaute = $request->validate(['leiaute' => ['nullable', 'string', 'max:40']])['leiaute'] ?? null;

        return $this->executar(fn () => response()->json(['data' => $this->service->aplicar($modelo, $leiaute)]));
    }

    /** @return array<string, mixed> */
    private function formatar(ModeloExportacao $m): array
    {
        return ['id' => $m->id, 'nome' => $m->nome, 'leiaute' => $m->leiaute, 'campos' => $m->campos, 'padrao' => $m->padrao];
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'nome' => ['required', 'string', 'max:100'],
            'leiaute' => ['nullable', 'string', 'max:40'],
            'campos' => ['required', 'array', 'min:1'],
            'campos.*' => ['string', 'max:60'],
        ];
    }
}
