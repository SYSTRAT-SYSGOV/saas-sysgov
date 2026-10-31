<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Enums\TipoEmpresa;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\EmpresaService;
use Modules\Transporte\Support\Formata;
use Symfony\Component\HttpFoundation\Response;

final class EmpresaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly EmpresaService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $empresas = Empresa::query()->with('pessoa')->get()->sortBy(fn (Empresa $e): string => mb_strtolower($e->nome()));

        return response()->json(['data' => $empresas->map(fn (Empresa $e): array => $this->formata->empresa($e))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $dados = $request->validate([
            'pessoa_id' => ['nullable', 'integer', 'required_without:cnpj'],
            'cnpj' => ['nullable', 'string', 'max:20', 'required_without:pessoa_id'],
            'razao_social' => ['nullable', 'string', 'max:200', 'required_without:pessoa_id'],
            'nome_fantasia' => ['nullable', 'string', 'max:200'],
            ...$this->regras(),
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->empresa($this->service->salvar(null, $dados)->load('pessoa'))], 201));
    }

    public function update(Request $request, Empresa $empresa): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->empresa($this->service->salvar($empresa, $dados)->load('pessoa'))]));
    }

    public function destroy(Request $request, Empresa $empresa): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);

        return $this->executar(function () use ($empresa): JsonResponse {
            $this->service->excluir($empresa);

            return response()->json(['excluida' => true]);
        });
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'tipo' => ['required', Rule::in(array_column(TipoEmpresa::cases(), 'value'))],
            'contrato_numero' => ['required', 'string', 'max:100'],
            'vigencia_inicio' => ['required', 'date'],
            'vigencia_fim' => ['required', 'date', 'after_or_equal:vigencia_inicio'],
            'ativa' => ['sometimes', 'boolean'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
