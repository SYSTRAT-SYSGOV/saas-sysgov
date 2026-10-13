<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Http\Requests\AtualizarUnidadeRequest;
use Modules\Escola\Http\Requests\EnviarLogoRequest;
use Modules\Escola\Models\Unidade;
use Modules\Escola\Services\UnidadeService;
use Symfony\Component\HttpFoundation\Response;

final class UnidadeController extends Controller
{
    public function __construct(private readonly UnidadeService $unidades) {}

    public function show(): JsonResponse
    {
        $this->authorize('viewAny', Unidade::class);

        return response()->json($this->unidades->obter());
    }

    public function update(AtualizarUnidadeRequest $request): JsonResponse
    {
        return response()->json($this->unidades->atualizar($request->validated('nome')));
    }

    public function enviarLogo(EnviarLogoRequest $request): JsonResponse
    {
        return response()->json($this->unidades->definirLogo($request->file('logo')));
    }

    /** Logo servido só por rota autenticada do próprio tenant (disco privado). */
    public function logo(): Response
    {
        $this->authorize('viewAny', Unidade::class);
        $unidade = $this->unidades->obter();
        abort_if($unidade->logo_path === null || !Storage::disk(UnidadeService::DISCO)->exists($unidade->logo_path), 404);

        return Storage::disk(UnidadeService::DISCO)->response($unidade->logo_path);
    }
}
