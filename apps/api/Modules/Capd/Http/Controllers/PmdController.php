<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\PlanoMelhoria;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\PmdService;

/**
 * CRUD de Planos de Melhoria de Desempenho (PMD) — RF-09.
 */
final class PmdController extends Controller
{
    public function __construct(
        private readonly PmdService $pmdService,
    ) {}

    /** Lista PMDs com filtros opcionais. */
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only(['status', 'ciclo_id', 'servidor_id']);
        $pmds    = $this->pmdService->listar($filtros);

        return response()->json($pmds);
    }

    /** Cria PMD manualmente (quando a Comissão inicia o plano). */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $validated = $request->validate([
            'servidor_id'          => ['required', 'integer', 'exists:capd_servidores,id'],
            'ciclo_id'             => ['required', 'integer', 'exists:capd_ciclos,id'],
            'nfc_gatilho'          => ['required', 'numeric', 'min:0', 'max:100'],
            'conceito_atingido'    => ['nullable', 'string', 'max:30'],
            'responsavel_id'       => ['nullable', 'integer', 'exists:users,id'],
            'objetivos'            => ['required', 'string'],
            'acoes'                => ['nullable', 'array'],
            'prazo'                => ['required', 'date'],
            'ciclo_verificacao_id' => ['nullable', 'integer', 'exists:capd_ciclos,id'],
        ]);

        $servidor = Servidor::findOrFail($validated['servidor_id']);
        $ciclo    = CicloAvaliacao::findOrFail($validated['ciclo_id']);

        $pmd = $this->pmdService->criarParaServidor(
            $servidor,
            $ciclo,
            number_format((float) $validated['nfc_gatilho'], 2, '.', ''),
            $validated['conceito_atingido'] ?? null,
            null,
            $validated,
        );

        return response()->json($pmd->load(['ciclo', 'cicloVerificacao']), 201);
    }

    /** Exibe um PMD. */
    public function show(int $id): JsonResponse
    {
        $pmd = PlanoMelhoria::with(['ciclo', 'cicloVerificacao', 'servidor:id,nome_completo,matricula,cargo_efetivo,orgao_lotacao'])->findOrFail($id);

        return response()->json($pmd);
    }

    /** Atualiza PMD (objetivos, ações, prazo, status). */
    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $pmd = PlanoMelhoria::findOrFail($id);

        $validated = $request->validate([
            'objetivos'              => ['sometimes', 'string'],
            'acoes'                  => ['sometimes', 'nullable', 'array'],
            'prazo'                  => ['sometimes', 'date'],
            'status'                 => ['sometimes', 'string', 'in:' . implode(',', PlanoMelhoria::STATUS_VALIDOS)],
            'ciclo_verificacao_id'   => ['sometimes', 'nullable', 'integer', 'exists:capd_ciclos,id'],
            'observacoes_verificacao'=> ['sometimes', 'nullable', 'string'],
        ]);

        $pmd = $this->pmdService->atualizar($pmd, $validated);

        return response()->json($pmd->load(['ciclo', 'cicloVerificacao']));
    }

    /** Marca as ações do plano como executadas pelo responsável. */
    public function concluirAcoes(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $pmd = PlanoMelhoria::findOrFail($id);

        try {
            $pmd = $this->pmdService->concluirAcoes($pmd);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($pmd->load(['ciclo', 'cicloVerificacao']));
    }

    /** Registra verificação de evolução no ciclo de verificação. */
    public function registrarVerificacao(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $pmd = PlanoMelhoria::findOrFail($id);

        $validated = $request->validate([
            'nfc_novo_ciclo' => ['required', 'numeric', 'min:0', 'max:100'],
            'observacoes'    => ['required', 'string'],
        ]);

        $resultado = $this->pmdService->verificarEvolucao(
            $pmd,
            number_format((float) $validated['nfc_novo_ciclo'], 2, '.', ''),
            $validated['observacoes'],
            $request->user()->id,
        );

        return response()->json([
            'pmd'         => $pmd->fresh()->load(['ciclo', 'cicloVerificacao']),
            'verificacao' => $resultado,
        ]);
    }
}
