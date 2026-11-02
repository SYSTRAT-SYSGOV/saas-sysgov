<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\Fornecedor;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\FornecedorService;
use Modules\Transporte\Support\Formata;
use Symfony\Component\HttpFoundation\Response;

/** Fornecedores da frota: ler exige `manutencao.ver`; alterar exige `manutencao.gerir`. */
final class FornecedorController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly FornecedorService $service, private readonly TransportePolicy $policy, private readonly Formata $formata) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->verManutencao($request->user()), 403);
        $fornecedores = Fornecedor::query()->with('pessoa')->get()->sortBy(fn (Fornecedor $f): string => mb_strtolower($f->nome()));

        return response()->json(['data' => $fornecedores->map(fn (Fornecedor $f): array => $this->formata->fornecedor($f))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate([
            'pessoa_id' => ['nullable', 'integer', 'required_without:cnpj'],
            'cnpj' => ['nullable', 'string', 'max:20', 'required_without:pessoa_id'],
            'razao_social' => ['nullable', 'string', 'max:200', 'required_without:pessoa_id'],
            'nome_fantasia' => ['nullable', 'string', 'max:200'],
            ...$this->regras(),
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->fornecedor($this->service->salvar(null, $dados)->load('pessoa'))], 201));
    }

    public function update(Request $request, Fornecedor $fornecedor): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->fornecedor($this->service->salvar($fornecedor, $dados)->load('pessoa'))]));
    }

    public function destroy(Request $request, Fornecedor $fornecedor): Response
    {
        abort_unless($this->policy->gerenciarManutencao($request->user()), 403);

        return $this->executar(function () use ($fornecedor): JsonResponse {
            $this->service->excluir($fornecedor);

            return response()->json(['excluido' => true]);
        });
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'ramos' => ['required', 'array', 'min:1', 'max:10'],
            'ramos.*' => ['string', Rule::in(array_keys(Catalogo::RAMOS))],
            'contato' => ['nullable', 'string', 'max:150'],
            'ativo' => ['sometimes', 'boolean'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
