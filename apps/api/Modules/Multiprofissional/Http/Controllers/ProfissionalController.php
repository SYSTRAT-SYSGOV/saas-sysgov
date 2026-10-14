<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Multiprofissional\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;
use Modules\Multiprofissional\Services\ProfissionalService;
use Modules\Multiprofissional\Support\Formata;
use Modules\Multiprofissional\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class ProfissionalController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ProfissionalService $service,
        private readonly MultiprofissionalPolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $profissionais = Profissional::query()->with(['cargo', 'usuario'])->orderBy('nome')->get();

        return response()->json(['data' => $profissionais->map(fn (Profissional $p): array => $this->formata->profissional($p))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);
        $dados = $request->validate([
            'cpf' => ['required', 'string', 'max:20'],
            'nome' => ['required', 'string', 'max:200'],
            ...$this->regras(),
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->profissional($this->service->salvar(null, $dados)->load(['cargo', 'usuario']))], 201));
    }

    public function update(Request $request, Profissional $profissional): Response
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->profissional($this->service->salvar($profissional, $dados)->load(['cargo', 'usuario']))]));
    }

    public function destroy(Request $request, Profissional $profissional): JsonResponse
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);

        return response()->json(['excluido' => $this->service->excluir($profissional)]);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'cargo_id' => ['required', 'integer', Vinculos::existe('multi_cargos')],
            // Só usuário vinculado ao tenant atual.
            'user_id' => ['nullable', 'integer', Rule::exists('tenant_user', 'user_id')->where('tenant_id', app(TenantContext::class)->id())],
            'registro_profissional' => ['nullable', 'string', 'max:50'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }
}
