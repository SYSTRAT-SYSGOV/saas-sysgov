<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\MotoristaService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class MotoristaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly MotoristaService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $motoristas = Motorista::query()->with(['pessoa', 'empresa.pessoa'])->get()->sortBy(fn (Motorista $m): string => mb_strtolower($m->nome()));

        return response()->json(['data' => $motoristas->map(fn (Motorista $m): array => $this->formata->motorista($m))->values()]);
    }

    public function store(Request $request): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $request->merge(['cnh_categoria' => strtoupper((string) $request->input('cnh_categoria'))]);
        $dados = $request->validate([
            'pessoa_id' => ['nullable', 'integer', 'required_without:cpf'],
            'cpf' => ['nullable', 'string', 'max:20', 'required_without:pessoa_id'],
            'nome' => ['nullable', 'string', 'max:200', 'required_without:pessoa_id'],
            'data_nascimento' => ['nullable', 'date', 'before:today'],
            ...$this->regras(),
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->formata->motorista($this->service->salvar(null, $dados)->load(['pessoa', 'empresa.pessoa']))], 201));
    }

    public function update(Request $request, Motorista $motorista): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $request->merge(['cnh_categoria' => strtoupper((string) $request->input('cnh_categoria'))]);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json(['data' => $this->formata->motorista($this->service->salvar($motorista, $dados)->load(['pessoa', 'empresa.pessoa']))]));
    }

    public function destroy(Request $request, Motorista $motorista): Response
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);

        return $this->executar(function () use ($motorista): JsonResponse {
            $this->service->excluir($motorista);

            return response()->json(['excluido' => true]);
        });
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'empresa_id' => ['nullable', 'integer', Vinculos::existe('transporte_empresas', true)],
            'cnh_numero' => ['required', 'string', 'max:30'],
            'cnh_categoria' => ['required', Rule::in(['D', 'E'])],
            'cnh_primeira_habilitacao' => ['nullable', 'date'],
            'cnh_validade' => ['required', 'date'],
            'curso_certificado' => ['nullable', 'string', 'max:100'],
            'curso_validade' => ['nullable', 'date'],
            'toxicologico_data' => ['nullable', 'date'],
            'toxicologico_validade' => ['nullable', 'date'],
            'ativo' => ['sometimes', 'boolean'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
