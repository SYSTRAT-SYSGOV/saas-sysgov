<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\AprovacaoFinalService;

final class AprovacaoFinalController extends Controller
{
    public function __construct(
        private readonly AprovacaoFinalService $aprovacoesFinais,
    ) {}

    public function solicitar(Request $request, int $id): JsonResponse
    {
        $processo = Processo::findOrFail($id);
        $this->authorize('solicitarAprovacaoFinal', $processo);

        try {
            $aprovacao = $this->aprovacoesFinais->solicitar($processo, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($aprovacao);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        $processo = Processo::findOrFail($id);
        $this->authorize('aprovarFinal', $processo);

        $parecer = $request->validate(['parecer' => ['nullable', 'string', 'max:1000']])['parecer'] ?? null;

        try {
            $aprovacao = $this->aprovacoesFinais->aprovar($processo, $request->user(), $parecer);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($aprovacao);
    }

    public function rejeitar(Request $request, int $id): JsonResponse
    {
        $processo = Processo::findOrFail($id);
        $this->authorize('rejeitarFinal', $processo);

        $motivo = $request->validate(['motivo' => ['required', 'string', 'max:1000']])['motivo'];

        try {
            $aprovacao = $this->aprovacoesFinais->rejeitar($processo, $request->user(), $motivo);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($aprovacao);
    }
}
