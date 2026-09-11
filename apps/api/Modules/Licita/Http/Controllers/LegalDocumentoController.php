<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Services\LegalDocumentoService;

final class LegalDocumentoController extends Controller
{
    public function __construct(
        private readonly LegalDocumentoService $documentos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LegalDocumento::class);

        $lista = $this->documentos->listar(
            $request->query('tipo'),
            $request->query('search')
        );

        return response()->json(['data' => $lista]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', LegalDocumento::class);

        $data = $this->validatedData($request);
        $global = (bool) $request->boolean('global');

        try {
            $documento = $this->documentos->criar($data, $request->user(), $global);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($documento, 201);
    }

    public function show(int $id): JsonResponse
    {
        $documento = LegalDocumento::findOrFail($id);
        $this->authorize('view', $documento);

        return response()->json($documento);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $documento = LegalDocumento::findOrFail($id);
        $this->authorize('update', $documento);

        $data = $this->validatedData($request, partial: true);
        $documento = $this->documentos->atualizar($documento, $data);

        return response()->json($documento);
    }

    public function destroy(int $id): JsonResponse
    {
        $documento = LegalDocumento::findOrFail($id);
        $this->authorize('delete', $documento);

        $this->documentos->excluir($documento);

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        // Ver o mesmo comentário em DfdController::validatedData() — "sometimes"
        // sozinho não bloqueia um campo presente e vazio no update, só um
        // campo ausente.
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        return $request->validate([
            'tipo' => [...$required, 'in:lei,decreto,instrucao_normativa,jurisprudencia,outro'],
            'numero' => ['nullable', 'string', 'max:255'],
            'titulo' => [...$required, 'string', 'max:500'],
            'ementa' => ['nullable', 'string', 'max:2000'],
            'texto_completo' => [...$required, 'string'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:100'],
            'ativo' => ['sometimes', 'boolean'],
        ]);
    }
}
