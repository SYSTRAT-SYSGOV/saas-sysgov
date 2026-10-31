<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Enums\OrigemVeiculo;
use Modules\Transporte\Enums\TipoRede;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\VeiculoService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class VeiculoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly VeiculoService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $veiculos = Veiculo::query()->with(['empresa.pessoa', 'motoristaPadrao.pessoa'])->withMax('vistorias', 'validade')->orderBy('placa')->get();

        return response()->json(['data' => $veiculos->map(fn (Veiculo $v): array => $this->formata->veiculo($v))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->veiculo($this->carregar($this->service->salvar(null, $dados)))], 201));
    }

    public function update(Request $request, Veiculo $veiculo): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->veiculo($this->carregar($this->service->salvar($veiculo, $dados)))]));
    }

    public function destroy(Request $request, Veiculo $veiculo): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);

        return $this->executar(function () use ($veiculo): JsonResponse {
            $this->service->excluir($veiculo);

            return response()->json(['excluido' => true]);
        });
    }

    private function carregar(Veiculo $veiculo): Veiculo
    {
        return Veiculo::query()->with(['empresa.pessoa', 'motoristaPadrao.pessoa'])->withMax('vistorias', 'validade')->findOrFail($veiculo->id);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'origem' => ['required', Rule::in(array_column(OrigemVeiculo::cases(), 'value'))],
            'empresa_id' => ['nullable', 'integer', Vinculos::existe('transporte_empresas', true)],
            'motorista_padrao_id' => ['nullable', 'integer', Vinculos::existe('transporte_motoristas', true)],
            'descricao' => ['required', 'string', 'max:255'],
            'placa' => ['required', 'string', 'max:20'],
            'renavam' => ['nullable', 'string', 'max:30'],
            'chassi' => ['nullable', 'string', 'max:30'],
            'marca_modelo' => ['nullable', 'string', 'max:150'],
            'ano_fabricacao' => ['nullable', 'integer', 'between:1950,2100'],
            'ano_modelo' => ['nullable', 'integer', 'between:1950,2100'],
            'data_licenca' => ['nullable', 'date'],
            'capacidade' => ['required', 'integer', 'min:1', 'max:500'],
            'tipo_rede' => ['required', Rule::in(array_column(TipoRede::cases(), 'value'))],
            'tipologia_inep' => ['required', 'integer', 'between:1,11'],
            'uso_exclusivo' => ['sometimes', 'boolean'],
            'acessivel' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'motivo_inativacao' => ['nullable', 'string', 'max:1000'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
