<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\TramitacaoPoderes;
use Modules\Requerimentos\Services\TramitacaoPoderesService;

final class TramitacaoPoderesController extends Controller
{
    public function __construct(
        private readonly TramitacaoPoderesService $tramitacaoService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TramitacaoPoderes::class);

        $query = TramitacaoPoderes::with(['proposicao.tipoInstrumento', 'remetente', 'responsavel']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $tramitacoes = $query->latest()->paginate($request->input('per_page', 15));

        return response()->json($tramitacoes);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'proposicao_id'    => ['required', 'integer', 'exists:requerimentos_proposicoes,id'],
            'poder_origem'     => ['required', 'string', 'in:camara,prefeitura'],
            'poder_destino'    => ['required', 'string', 'in:camara,prefeitura'],
            'responsavel_id'   => ['nullable', 'integer'],
            'prazo_dias'       => ['nullable', 'integer', 'min:1'],
            'observacao'       => ['nullable', 'string'],
        ]);

        $proposicao = Proposicao::findOrFail($validated['proposicao_id']);

        $this->authorize('encaminhar', $proposicao);

        try {
            $tramitacao = $this->tramitacaoService->encaminhar($proposicao, $validated, $user);
            return response()->json($tramitacao->load('proposicao', 'remetente', 'responsavel'), 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function registrarRecebimento(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tramitacao = TramitacaoPoderes::findOrFail($id);

        $this->authorize('registrarRecebimento', $tramitacao);

        try {
            $this->tramitacaoService->registrarRecebimento($tramitacao, $user);
            return response()->json($tramitacao->fresh());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}