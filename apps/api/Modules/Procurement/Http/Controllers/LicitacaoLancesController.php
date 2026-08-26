<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoParticipante;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\BiddingRoomService;

final class LicitacaoLancesController extends Controller
{
    public function __construct(
        private readonly BiddingRoomService $biddingRoom,
        private readonly AuditHMACService $audit
    ) {}

    public function index(int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);
        $liveData = $this->biddingRoom->getLiveRanking($licitacao);

        return response()->json($liveData);
    }

    public function store(Request $request, int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);

        $validated = $request->validate([
            'participante_id' => ['required', 'integer', 'exists:licitacao_participantes,id'],
            'valor_cents' => ['required', 'integer', 'min:1'],
        ]);

        $participante = LicitacaoParticipante::findOrFail($validated['participante_id']);

        try {
            $lance = $this->biddingRoom->placeBid(
                $licitacao,
                $participante,
                $validated['valor_cents'],
                $request->ip()
            );
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $liveData = $this->biddingRoom->getLiveRanking($licitacao);

        $this->audit->record(
            'procurement',
            'lance.placed',
            "Lance de R$ " . number_format($lance->valor_cents / 100, 2, ',', '.') . " ofertado por {$participante->razao_social}",
            null,
            $lance->toArray()
        );

        return response()->json([
            'lance' => $lance,
            'live_ranking' => $liveData,
        ], 201);
    }

    public function participantes(int $licitacaoId): JsonResponse
    {
        $participantes = LicitacaoParticipante::where('licitacao_id', $licitacaoId)->get();
        return response()->json($participantes);
    }

    public function credenciarParticipante(Request $request, int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);

        $validated = $request->validate([
            'razao_social' => ['required', 'string', 'max:255'],
            'cnpj' => ['required', 'string', 'size:14'],
            'porte_me_epp' => ['nullable', 'boolean'],
        ]);

        $participante = LicitacaoParticipante::create([
            'tenant_id' => $licitacao->tenant_id,
            'licitacao_id' => $licitacao->id,
            'razao_social' => $validated['razao_social'],
            'cnpj' => $validated['cnpj'],
            'porte_me_epp' => $validated['porte_me_epp'] ?? false,
            'status' => 'credenciado',
        ]);

        $this->audit->record(
            'procurement',
            'participante.credenciado',
            "Fornecedor {$participante->razao_social} credenciado na Licitação #{$licitacao->id}",
            null,
            $participante->toArray()
        );

        return response()->json($participante, 201);
    }
}
