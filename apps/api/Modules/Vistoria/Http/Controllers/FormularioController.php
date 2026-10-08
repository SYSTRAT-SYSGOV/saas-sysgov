<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Http\Requests\StoreModeloFormularioRequest;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Services\FormularioService;

final class FormularioController extends Controller
{
    public function __construct(
        private readonly FormularioService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ModeloFormulario::class);

        return response()->json($this->service->listar($request->only(['tipo_fiscalizacao', 'per_page'])));
    }

    public function store(StoreModeloFormularioRequest $request): JsonResponse
    {
        try {
            $modelo = $this->service->criarModeloFormulario($request->validated());

            return response()->json($modelo->load('perguntas'), 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
