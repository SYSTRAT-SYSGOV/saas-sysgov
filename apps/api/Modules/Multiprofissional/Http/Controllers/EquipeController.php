<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Multiprofissional\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Models\Equipe;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;
use Modules\Multiprofissional\Services\EquipeService;
use Modules\Multiprofissional\Support\Formata;
use Modules\Multiprofissional\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class EquipeController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly EquipeService $service,
        private readonly MultiprofissionalPolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $equipes = Equipe::query()->with(['profissionais', 'escolas'])->orderBy('nome')->get();

        return response()->json(['data' => $equipes->map(fn (Equipe $e): array => $this->formata->equipe($e))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->equipe($this->service->salvar(null, $dados)->load(['profissionais', 'escolas']))], 201));
    }

    public function update(Request $request, Equipe $equipe): Response
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->equipe($this->service->salvar($equipe, $dados)->load(['profissionais', 'escolas']))]));
    }

    public function destroy(Request $request, Equipe $equipe): JsonResponse
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);

        return response()->json(['excluido' => $this->service->excluir($equipe)]);
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'nome' => ['required', 'string', 'max:200'],
            'turno' => ['nullable', 'string', 'in:' . implode(',', array_keys(Atendimento::TURNOS))],
            'ativo' => ['sometimes', 'boolean'],
            'profissionais' => ['present', 'array'],
            'profissionais.*' => ['integer', 'distinct', Vinculos::existe('multi_profissionais')],
            'escolas' => ['present', 'array'],
            'escolas.*' => ['integer', 'distinct', Vinculos::existe('escola_escolas')],
        ];
    }
}
