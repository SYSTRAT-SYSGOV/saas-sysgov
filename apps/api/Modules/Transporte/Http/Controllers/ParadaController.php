<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ParadaService;
use Modules\Transporte\Support\Formata;
use Symfony\Component\HttpFoundation\Response;

final class ParadaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ParadaService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'ativa' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $pagina = Parada::query()
            ->when($filtros['q'] ?? null, fn ($q, $busca) => $q->where('nome', 'like', '%' . $busca . '%'))
            ->when(array_key_exists('ativa', $filtros), fn ($q) => $q->where('ativa', (bool) $filtros['ativa']))
            ->orderBy('nome')
            ->paginate((int) ($filtros['per_page'] ?? 50));

        return response()->json([
            'data' => collect($pagina->items())->map(fn (Parada $p): array => $this->formata->parada($p))->values(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->parada($this->service->salvar(null, $dados))], 201));
    }

    public function update(Request $request, Parada $parada): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->parada($this->service->salvar($parada, $dados))]));
    }

    public function destroy(Request $request, Parada $parada): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);

        return $this->executar(function () use ($parada): JsonResponse {
            $this->service->excluir($parada);

            return response()->json(['excluido' => true]);
        });
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'nome' => ['required', 'string', 'max:150'],
            'descricao' => ['nullable', 'string', 'max:2000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'cep' => ['nullable', 'string', 'max:9'],
            'logradouro' => ['nullable', 'string', 'max:200'],
            'numero' => ['nullable', 'string', 'max:20'],
            'complemento' => ['nullable', 'string', 'max:100'],
            'bairro' => ['nullable', 'string', 'max:100'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'uf' => ['nullable', 'string', 'size:2'],
            'referencia' => ['nullable', 'string', 'max:255'],
            'ativa' => ['sometimes', 'boolean'],
        ];
    }
}
