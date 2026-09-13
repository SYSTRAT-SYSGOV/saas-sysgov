<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Database\Seeders\CapdPerguntasPadraoSeeder;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Services\PerguntaService;

/**
 * Controller de Modelos de Formulário e Perguntas do Instrumento de Avaliação.
 */
final class PerguntaController extends Controller
{
    public function __construct(
        private readonly PerguntaService $perguntaService,
    ) {}

    public function indexModelos(Request $request): JsonResponse
    {
        $planoId = $request->query('plano_carreira_id') ? (int) $request->query('plano_carreira_id') : null;
        $cargo = $request->query('cargo') ? (string) $request->query('cargo') : null;

        $modelos = $this->perguntaService->listarModelos($planoId, $cargo);

        return response()->json($modelos);
    }

    public function modeloVigente(Request $request): JsonResponse
    {
        $planoId = $request->query('plano_carreira_id') ? (int) $request->query('plano_carreira_id') : null;
        $cargo = $request->query('cargo') ? (string) $request->query('cargo') : null;

        $modelo = $this->perguntaService->getModeloVigente($planoId, $cargo);

        if (! $modelo) {
            return response()->json(['message' => 'Nenhum modelo vigente encontrado.'], 404);
        }

        return response()->json($modelo);
    }

    public function storeModelo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id'                => ['nullable', 'integer'],
            'codigo'            => ['required', 'string', 'max:50'],
            'nome'              => ['required', 'string', 'max:150'],
            'descricao'         => ['nullable', 'string'],
            'plano_carreira_id' => ['nullable', 'integer'],
            'cargo'             => ['nullable', 'string'],
            'vigencia_inicio'   => ['required', 'date'],
            'vigencia_fim'      => ['nullable', 'date'],
            'grupos'            => ['nullable', 'array'],
            'ativo'             => ['nullable', 'boolean'],
        ]);

        $modelo = $this->perguntaService->salvarModelo($validated);

        return response()->json($modelo, 201);
    }

    public function showModelo(int $id): JsonResponse
    {
        $modelo = ModeloFormulario::with(['perguntasAtivas', 'planoCarreira'])->findOrFail($id);

        return response()->json($modelo);
    }

    public function storePergunta(Request $request, int $modeloId): JsonResponse
    {
        $modelo = ModeloFormulario::findOrFail($modeloId);

        $validated = $request->validate([
            'id'                  => ['nullable', 'integer'],
            'codigo'              => ['required', 'string', 'max:30'],
            'enunciado'           => ['required', 'string'],
            'tipo'                => ['required', 'string'],
            'opcoes'              => ['nullable', 'array'],
            'peso'                => ['nullable', 'numeric'],
            'grupo_key'           => ['nullable', 'string', 'max:50'],
            'ordem'               => ['nullable', 'integer'],
            'obrigatoria'         => ['nullable', 'boolean'],
            'exige_evidencia'     => ['nullable', 'boolean'],
            'regras_condicionais' => ['nullable', 'array'],
            'cargos_permitidos'   => ['nullable', 'array'],
            'ativo'               => ['nullable', 'boolean'],
        ]);

        try {
            $pergunta = $this->perguntaService->salvarPergunta($modelo, $validated);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($pergunta, 201);
    }

    public function destroyPergunta(int $id): JsonResponse
    {
        $pergunta = Pergunta::findOrFail($id);
        $this->perguntaService->excluirPergunta($pergunta);

        return response()->json(['message' => 'Pergunta removida com sucesso.']);
    }

    public function seedPadrao(): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->hasTenant()
            ? app(\App\Support\TenantContext::class)->id()
            : null;

        $seeder = new CapdPerguntasPadraoSeeder();
        $seeder->run($tenantId);

        return response()->json([
            'message' => 'Modelo de avaliação padrão (Escala Gráfica de Chiavenato F1 a F8) gerado com sucesso.',
        ]);
    }
}
