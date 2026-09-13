<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\Sessao;
use Modules\Capd\Models\SessaoPauta;
use Modules\Capd\Services\HashAtaService;

/**
 * Gestão de Sessões Deliberativas da CAPD e Lavratura de Atas com Selo SHA-256.
 */
final class SessaoController extends Controller
{
    public function __construct(
        private readonly HashAtaService $hashAta,
        private readonly AuditLogger    $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sessoes = Sessao::with(['comissao:id,numero_portaria', 'pautas.recurso.recorrente:id,name'])
            ->latest('data_sessao')
            ->paginate((int) $request->query('per_page', 15));

        return response()->json($sessoes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();

        $validated = $request->validate([
            'comissao_id'   => ['required', 'integer', 'exists:capd_comissoes,id'],
            'tipo_sessao'   => ['required', 'string', 'in:ordinaria,extraordinaria'],
            'data_sessao'   => ['required', 'date', 'after:now'],
            'quorum_minimo' => ['nullable', 'integer', 'min:3'],
        ]);

        $sessao = Sessao::create([
            ...$validated,
            'tenant_id'       => $tenantId,
            'quorum_presente' => 0,
            'finalizada'      => false,
        ]);

        $this->audit->record('capd', 'sessao.agendada', "Sessão #{$sessao->id} ({$sessao->tipo_sessao}) agendada para {$sessao->data_sessao}", null, $sessao->toArray());

        return response()->json($sessao, 201);
    }

    public function show(int $id): JsonResponse
    {
        $sessao = Sessao::with([
            'comissao.membros.servidor:id,name',
            'pautas.recurso.fatorContestado',
            'pautas.recurso.recorrente:id,name',
            'deliberacoes.membro.servidor:id,name',
        ])->findOrFail($id);

        return response()->json([
            'sessao'                => $sessao,
            'integridade_ata_ok'    => $this->hashAta->verificarIntegridade($sessao),
        ]);
    }

    public function adicionarPauta(Request $request, int $id): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $sessao   = Sessao::findOrFail($id);

        abort_if($sessao->finalizada, 422, 'Não é possível alterar a pauta de uma sessão já finalizada.');

        $validated = $request->validate([
            'recurso_id'   => ['nullable', 'integer', 'exists:capd_recursos,id'],
            'avaliacao_id' => ['nullable', 'integer', 'exists:capd_avaliacoes,id'],
        ]);

        if (empty($validated['recurso_id']) && empty($validated['avaliacao_id'])) {
            abort(422, 'É necessário informar ao menos um recurso_id ou avaliacao_id para pautar.');
        }

        $ordem = (int) SessaoPauta::where('sessao_id', $sessao->id)->max('ordem') + 1;

        $pauta = SessaoPauta::create([
            ...$validated,
            'tenant_id'    => $tenantId,
            'sessao_id'    => $sessao->id,
            'ordem'        => $ordem,
            'status_pauta' => 'pendente',
        ]);

        if (! empty($validated['recurso_id'])) {
            Recurso::where('id', $validated['recurso_id'])->update(['status' => 'pautado']);
        }

        return response()->json($pauta, 201);
    }

    public function registrarPresenca(Request $request, int $id): JsonResponse
    {
        $sessao = Sessao::findOrFail($id);
        abort_if($sessao->finalizada, 422, 'Sessão já finalizada.');

        $request->validate([
            'quorum_presente' => ['required', 'integer', 'min:1'],
        ]);

        $sessao->update(['quorum_presente' => $request->quorum_presente]);

        return response()->json([
            'sessao'      => $sessao,
            'tem_quorum'  => $sessao->temQuorum(),
        ]);
    }

    public function selarAta(Request $request, int $id): JsonResponse
    {
        $sessao = Sessao::findOrFail($id);

        $request->validate([
            'ata_texto' => ['required', 'string', 'min:100', 'max:50000'],
        ]);

        $hashSha256 = $this->hashAta->selarAta($sessao, $request->ata_texto);

        return response()->json([
            'message'         => 'Ata lavrada e selada imutavelmente com sucesso.',
            'hash_ata_sha256' => $hashSha256,
            'finalizada_em'   => $sessao->fresh()->finalizada_em,
        ]);
    }
}
