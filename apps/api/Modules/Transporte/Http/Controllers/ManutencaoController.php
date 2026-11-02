<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\ManutencaoPrevista;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ManutencaoPrevistaService;
use Modules\Transporte\Services\RelatorioManutencaoService;
use Modules\Transporte\Services\VeiculoService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

/** Manutenção prevista, quilometragem do veículo, gastos e histórico. */
final class ManutencaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ManutencaoPrevistaService $previstas,
        private readonly RelatorioManutencaoService $relatorios,
        private readonly VeiculoService $veiculos,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function previstas(Request $request): JsonResponse
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);
        $status = $request->validate(['status' => ['nullable', 'in:pendente,convertida,cancelada']])['status'] ?? 'pendente';
        $lista = ManutencaoPrevista::query()->with('veiculo')->where('status', $status)->orderBy('data_prevista')->orderBy('km_previsto')->get();

        return response()->json(['data' => $lista->map(fn (ManutencaoPrevista $p): array => $this->formata->manutencaoPrevista($p))->values()]);
    }

    public function criarPrevista(Request $request): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate([
            'veiculo_id' => ['required', 'integer', Vinculos::existe('transporte_veiculos', true)], 'descricao' => ['required', 'string', 'min:3', 'max:255'],
            'data_prevista' => ['nullable', 'date_format:Y-m-d'], 'km_previsto' => ['nullable', 'integer', 'min:0', 'max:9999999'],
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->manutencaoPrevista($this->previstas->criar($dados)->load('veiculo'))], 201));
    }

    public function cancelarPrevista(Request $request, ManutencaoPrevista $prevista): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);

        return $this->executar(fn () => response()->json(['data' => $this->formata->manutencaoPrevista($this->previstas->cancelar($prevista)->load('veiculo'))]));
    }

    public function converterPrevista(Request $request, ManutencaoPrevista $prevista): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $fornecedor = $request->validate(['fornecedor_id' => ['nullable', 'integer', Vinculos::existe('transporte_fornecedores', true)]])['fornecedor_id'] ?? null;

        return $this->executar(function () use ($prevista, $fornecedor, $request): JsonResponse {
            $ordem = $this->previstas->converter($prevista, $fornecedor, $request->user()?->id)->load(['veiculo', 'fornecedor.pessoa']);

            return response()->json(['data' => $this->formata->ordemServico($ordem)], 201);
        });
    }

    public function quilometragem(Request $request, Veiculo $veiculo): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate(['km' => ['required', 'integer', 'min:0', 'max:9999999'], 'confirmar_reducao' => ['sometimes', 'boolean']]);

        return $this->executar(fn () => response()->json(['data' => ['id' => $veiculo->id, 'km_atual' => $this->veiculos->ajustarQuilometragem($veiculo, (int) $dados['km'], (bool) ($dados['confirmar_reducao'] ?? false))->km_atual]]));
    }

    public function gastos(Request $request): JsonResponse
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);
        $ano = (int) $request->validate(['ano' => ['required', 'integer', 'between:2000,2100']])['ano'];

        return response()->json(['data' => $this->relatorios->gastos($ano)]);
    }

    public function csv(Request $request): Response
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);
        $ano = (int) $request->validate(['ano' => ['required', 'integer', 'between:2000,2100']])['ano'];

        return response($this->relatorios->csv($ano), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="transporte-manutencao-' . $ano . '.csv"',
        ]);
    }

    public function historico(Request $request, Veiculo $veiculo): JsonResponse
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);

        return response()->json(['data' => $this->relatorios->historico($veiculo)]);
    }
}
