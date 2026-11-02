<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\CensoLeiaute;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\LeiauteImportacaoService;
use Symfony\Component\HttpFoundation\Response;

/** Leiaute de importação do Educacenso: ler exige importar ou configurar; alterar exige `transporte.censo.leiaute`. */
final class CensoLeiauteController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly LeiauteImportacaoService $service, private readonly TransportePolicy $policy) {}

    public function index(Request $request): JsonResponse
    {
        $this->podeLer($request);

        return response()->json(['data' => $this->service->listar()->map(fn (CensoLeiaute $l): array => $this->service->descrever($l, false))->values()]);
    }

    public function show(Request $request, CensoLeiaute $leiaute): JsonResponse
    {
        $this->podeLer($request);

        return response()->json(['data' => $this->service->descrever($leiaute)]);
    }

    /** Duplica um leiaute (o indicado ou o padrão) para um novo ano. */
    public function store(Request $request): Response
    {
        $this->podeConfigurar($request);
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100'],
            'ano_censo' => ['required', 'integer', 'min:2000', 'max:2100'],
            'copiar_de' => ['nullable', 'integer'],
        ]);

        return $this->executar(function () use ($dados): JsonResponse {
            $origem = isset($dados['copiar_de']) ? CensoLeiaute::query()->findOrFail($dados['copiar_de']) : $this->service->garantirPadrao();

            return response()->json(['data' => $this->service->descrever($this->service->duplicar($origem, $dados['nome'], (int) $dados['ano_censo']))], 201);
        });
    }

    public function update(Request $request, CensoLeiaute $leiaute): Response
    {
        $this->podeConfigurar($request);
        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:100'],
            'ano_censo' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'delimitador' => ['sometimes', 'string', 'size:1'],
            'codificacao' => ['sometimes', 'string', 'max:20'],
            'campos' => ['sometimes', 'array', 'max:200'],
            'campos.*' => ['array'],
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->service->descrever($this->service->salvar($leiaute, $dados))]));
    }

    public function restaurar(Request $request, CensoLeiaute $leiaute): Response
    {
        $this->podeConfigurar($request);

        return $this->executar(fn () => response()->json(['data' => $this->service->descrever($this->service->restaurar($leiaute))]));
    }

    public function padrao(Request $request, CensoLeiaute $leiaute): Response
    {
        $this->podeConfigurar($request);

        return $this->executar(fn () => response()->json(['data' => $this->service->descrever($this->service->definirPadrao($leiaute), false)]));
    }

    public function destroy(Request $request, CensoLeiaute $leiaute): Response
    {
        $this->podeConfigurar($request);

        return $this->executar(function () use ($leiaute): JsonResponse {
            $this->service->excluir($leiaute);

            return response()->json(['excluido' => true]);
        });
    }

    private function podeLer(Request $request): void
    {
        abort_unless($this->policy->importarCenso($request->user()) || $this->policy->configurarLeiauteCenso($request->user()), 403);
    }

    private function podeConfigurar(Request $request): void
    {
        abort_unless($this->policy->configurarLeiauteCenso($request->user()), 403);
    }
}
