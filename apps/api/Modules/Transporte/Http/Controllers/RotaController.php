<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Enums\TipoRede;
use Modules\Transporte\Enums\Turno;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\RotaService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class RotaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly RotaService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $filtros = $request->validate([
            'ano_letivo' => ['nullable', 'integer'],
            'escola_id' => ['nullable', 'integer'],
            'turno' => ['nullable', Rule::in(array_column(Turno::cases(), 'value'))],
            'tipo_rede' => ['nullable', Rule::in(array_column(TipoRede::cases(), 'value'))],
            'situacao' => ['nullable', Rule::in(['ativa', 'inativa'])],
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = Rota::query()
            ->with(['escola', 'empresa.pessoa', 'veiculo.empresa.pessoa', 'motorista.pessoa'])
            ->withCount('itinerario')
            ->when($filtros['ano_letivo'] ?? null, fn ($q, $v) => $q->where('ano_letivo', $v))
            ->when($filtros['escola_id'] ?? null, fn ($q, $v) => $q->where('escola_id', $v))
            ->when($filtros['turno'] ?? null, fn ($q, $v) => $q->where('turno', $v))
            ->when($filtros['tipo_rede'] ?? null, fn ($q, $v) => $q->where('tipo_rede', $v))
            ->when($filtros['situacao'] ?? null, fn ($q, $v) => $q->where('ativa', $v === 'ativa'))
            ->when($filtros['q'] ?? null, fn ($q, $v) => $q->where('nome', 'like', '%' . $v . '%'))
            ->orderByDesc('ano_letivo')->orderBy('nome')
            ->paginate((int) ($filtros['per_page'] ?? 25));

        return response()->json([
            'data' => collect($pagina->items())->map(fn (Rota $r): array => $this->formata->rota($r))->values(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    public function show(Request $request, Rota $rota): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);

        return response()->json(['data' => $this->formata->rota($this->carregar($rota))]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->rota($this->carregar($this->service->salvar(null, $dados)))], 201));
    }

    public function update(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->rota($this->carregar($this->service->salvar($rota, $dados)))]));
    }

    public function destroy(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);

        return $this->executar(function () use ($rota): JsonResponse {
            $this->service->excluir($rota);

            return response()->json(['excluido' => true]);
        });
    }

    private function carregar(Rota $rota): Rota
    {
        return Rota::query()->with(['escola', 'empresa.pessoa', 'veiculo.empresa.pessoa', 'motorista.pessoa'])->withCount('itinerario')->findOrFail($rota->id);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'escola_id' => ['required', 'integer', Vinculos::existe('escola_escolas')],
            'ano_letivo' => ['required', 'integer', 'between:2000,2100'],
            'empresa_id' => ['nullable', 'integer', Vinculos::existe('transporte_empresas', true)],
            'veiculo_id' => ['nullable', 'integer', Vinculos::existe('transporte_veiculos', true)],
            'motorista_id' => ['nullable', 'integer', Vinculos::existe('transporte_motoristas', true)],
            'nome' => ['required', 'string', 'max:150'],
            'turno' => ['required', Rule::in(array_column(Turno::cases(), 'value'))],
            'tipo_rede' => ['required', Rule::in(array_column(TipoRede::cases(), 'value'))],
            'km_pavimentado' => ['nullable', 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
            'km_nao_pavimentado' => ['nullable', 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
            'horario_saida' => ['nullable', 'date_format:H:i'],
            'horario_chegada' => ['nullable', 'date_format:H:i'],
            'horario_retorno' => ['nullable', 'date_format:H:i'],
            'ativa' => ['sometimes', 'boolean'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
