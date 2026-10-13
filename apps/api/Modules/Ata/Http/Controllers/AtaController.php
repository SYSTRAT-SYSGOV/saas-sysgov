<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Ata\Enums\StatusAta;
use Modules\Ata\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Ata\Models\Ata;
use Modules\Ata\Policies\AtaPolicy;
use Modules\Ata\Services\AtaIaService;
use Modules\Ata\Services\AtaService;
use Modules\Ata\Services\SecretariaAtaService;
use Modules\Ata\Support\FormataAta;
use Symfony\Component\HttpFoundation\Response;

final class AtaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AtaService $atas,
        private readonly SecretariaAtaService $secretarias,
        private readonly AtaPolicy $policy,
        private readonly AtaIaService $ia,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ata::class);
        $user = $request->user();
        $gerencia = $this->policy->gerencia($user);
        $filtros = $request->validate([
            'status' => ['nullable', Rule::enum(StatusAta::class)],
            'org_unit_id' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $consulta = Ata::query()->with(['secretaria', 'tipo', 'autor', 'participantes'])
            ->when(!$gerencia, fn ($q) => $q->whereIn('org_unit_id', $this->secretarias->secretariasDoUsuario($user)))
            ->when($filtros['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filtros['org_unit_id'] ?? null, fn ($q, $id) => $q->where('org_unit_id', $id))
            ->when($filtros['q'] ?? null, function ($q, $termo) use ($gerencia, $user) {
                // Busca por título não pode revelar ata sigilosa de terceiros.
                $q->where('titulo', 'like', '%' . $termo . '%')
                    ->when(!$gerencia, fn ($q) => $q->where(fn ($q) => $q->where('sigilosa', false)->orWhere('criado_por', $user->id)));
            })
            ->orderByDesc('created_at');

        $itens = $consulta->limit(500)->get()->map(fn (Ata $a): array => FormataAta::item($a, $this->policy->view($user, $a)));
        $todas = Ata::query()->when(!$gerencia, fn ($q) => $q->whereIn('org_unit_id', $this->secretarias->secretariasDoUsuario($user)));

        return response()->json([
            'data' => $itens->values(),
            'indicadores' => [
                'total' => (clone $todas)->count(),
                'em_redacao' => (clone $todas)->where('status', StatusAta::EmRedacao)->count(),
                'rascunhos' => (clone $todas)->where('status', StatusAta::Rascunho)->count(),
                'finalizadas' => (clone $todas)->where('status', StatusAta::Finalizada)->count(),
                'sigilosas' => (clone $todas)->where('sigilosa', true)->count(),
            ],
        ]);
    }

    public function store(Request $request): Response
    {
        $this->authorize('create', Ata::class);
        $dados = $this->validar($request, true);
        abort_unless($this->policy->criarNaSecretaria($request->user(), (int) $dados['org_unit_id']), 403, 'Você só pode criar atas nas secretarias em que está lotado.');

        return $this->executar(fn () => response()->json(FormataAta::detalhe($this->atas->criar($dados, $request->user()), $this->ia->disponivel()), 201));
    }

    public function show(Request $request, Ata $ata): JsonResponse
    {
        $this->authorize('view', $ata);
        if ($ata->sigilosa) {
            $this->audit->record('ata', 'ata.sigilosa_acessada', "ata:{$ata->id}", null, ['usuario' => $request->user()->id]);
        }

        return response()->json(FormataAta::detalhe($ata, $this->ia->disponivel()));
    }

    public function update(Request $request, Ata $ata): Response
    {
        $this->authorize('update', $ata);
        $dados = $this->validar($request, false);
        if (isset($dados['org_unit_id']) && (int) $dados['org_unit_id'] !== $ata->org_unit_id) {
            return response()->json(['error' => 'A secretaria não pode ser alterada: a numeração é por secretaria.'], 422);
        }

        return $this->executar(fn () => response()->json(FormataAta::detalhe($this->atas->atualizar($ata, $dados), $this->ia->disponivel())));
    }

    public function conteudo(Request $request, Ata $ata): Response
    {
        $this->authorize('update', $ata);
        $dados = $request->validate(['conteudo_html' => ['nullable', 'string', 'max:500000']]);

        return $this->executar(fn () => response()->json(FormataAta::detalhe($this->atas->salvarConteudo($ata, $dados['conteudo_html'] ?? ''), $this->ia->disponivel())));
    }

    public function rascunho(Request $request, Ata $ata): Response
    {
        $this->authorize('update', $ata);
        $dados = $request->validate(['conteudo_html' => ['nullable', 'string', 'max:500000']]);

        return $this->executar(fn () => response()->json(FormataAta::detalhe($this->atas->salvarRascunho($ata, $dados['conteudo_html'] ?? null), $this->ia->disponivel())));
    }

    public function destroy(Ata $ata): Response
    {
        $this->authorize('delete', $ata);

        return $this->executar(function () use ($ata) {
            $this->atas->excluir($ata);

            return response()->json(null, 204);
        });
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, bool $criando): array
    {
        $req = $criando ? 'required' : 'sometimes';

        return $request->validate([
            'org_unit_id' => [$req, 'integer'],
            'tipo_id' => ['nullable', 'integer'],
            'titulo' => [$req, 'string', 'max:255'],
            'data_reuniao' => [$req, 'date'],
            'local' => ['nullable', 'string', 'max:255'],
            'cidade' => ['nullable', 'string', 'max:120'],
            'redator' => [$req, 'string', 'max:150'],
            'sigilosa' => ['sometimes', 'boolean'],
            'conteudo_html' => ['sometimes', 'nullable', 'string', 'max:500000'],
            'participantes' => [$criando ? 'required' : 'sometimes', 'array', 'min:1', 'max:100'],
            'participantes.*.pessoa_id' => ['nullable', 'integer'],
            'participantes.*.nome' => ['nullable', 'string', 'max:150', 'required_without:participantes.*.pessoa_id'],
            'participantes.*.cargo' => ['nullable', 'string', 'max:120'],
        ]);
    }
}
