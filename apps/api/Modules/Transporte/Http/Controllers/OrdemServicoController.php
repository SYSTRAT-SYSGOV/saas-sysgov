<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\OrdemServicoService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

/** Ordens de serviço da frota: ler exige `manutencao.ver`; abrir, alterar, concluir e cancelar exigem `manutencao.gerir`. */
final class OrdemServicoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly OrdemServicoService $service, private readonly TransportePolicy $policy, private readonly Formata $formata) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);
        $f = $request->validate([
            'veiculo_id' => ['nullable', 'integer'], 'status' => ['nullable', Rule::in(array_keys(Catalogo::STATUS_OS))], 'ano' => ['nullable', 'integer', 'between:2000,2100'],
            'page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = OrdemServico::query()->with(['veiculo', 'fornecedor.pessoa'])
            ->when($f['veiculo_id'] ?? null, fn ($q, $v) => $q->where('veiculo_id', $v))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['ano'] ?? null, fn ($q, $v) => $q->whereYear('aberta_em', $v))
            ->orderByDesc('aberta_em')->orderByDesc('id')->paginate((int) ($f['per_page'] ?? 25));

        return response()->json([
            'data' => collect($pagina->items())->map(fn (OrdemServico $o): array => $this->formata->ordemServico($o))->values(),
            'current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total(),
        ]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate(['veiculo_id' => ['required', 'integer', Vinculos::existe('transporte_veiculos', true)], ...$this->regras()]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->ordemServico($this->carregar($this->service->abrir($dados, $request->user()?->id)))], 201));
    }

    public function update(Request $request, OrdemServico $ordem): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->ordemServico($this->carregar($this->service->atualizar($ordem, $dados)))]));
    }

    public function concluir(Request $request, OrdemServico $ordem): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate([
            'concluida_em' => ['required', 'date_format:Y-m-d'], 'km' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'valor' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->ordemServico($this->carregar($this->service->concluir($ordem, $dados)))]));
    }

    public function cancelar(Request $request, OrdemServico $ordem): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $motivo = $request->validate(['motivo' => ['nullable', 'string', 'max:255']])['motivo'] ?? null;

        return $this->executar(fn () => response()->json(['data' => $this->formata->ordemServico($this->carregar($this->service->cancelar($ordem, $motivo)))]));
    }

    private function carregar(OrdemServico $ordem): OrdemServico
    {
        return $ordem->load(['veiculo', 'fornecedor.pessoa']);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'fornecedor_id' => ['nullable', 'integer', Vinculos::existe('transporte_fornecedores', true)],
            'tipo' => ['required', Rule::in(array_keys(Catalogo::TIPOS_OS))],
            'descricao' => ['required', 'string', 'min:3', 'max:500'],
            'aberta_em' => ['required', 'date_format:Y-m-d'],
            'km' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'valor' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
        ];
    }
}
