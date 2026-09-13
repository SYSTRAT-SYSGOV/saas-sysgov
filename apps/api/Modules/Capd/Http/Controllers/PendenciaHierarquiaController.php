<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\PendenciaHierarquia;

final class PendenciaHierarquiaController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.pendencias.view'), 403);

        $query = PendenciaHierarquia::with(['servidor:id,nome_completo,matricula', 'ciclo:id,nome,ano_referencia']);

        $status = $request->query('status');
        if ($status !== null) {
            $query->where('status', $status);
        }

        return response()->json(
            $query->latest('created_at')->paginate((int) $request->query('per_page', 25))
        );
    }

    public function resolver(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.pendencias.resolver'), 403);

        $validated = $request->validate([
            'avaliador_designado_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $pendencia = PendenciaHierarquia::query()->findOrFail($id);

        abort_if($pendencia->status === PendenciaHierarquia::STATUS_RESOLVIDA, 422, 'Pendência já resolvida.');

        $pendencia->update([
            'status'                 => PendenciaHierarquia::STATUS_RESOLVIDA,
            'avaliador_designado_id' => $validated['avaliador_designado_id'],
            'resolvido_por'          => $request->user()->id,
            'resolvido_em'           => now(),
        ]);

        $servidorUserId = $pendencia->servidor?->user_id;

        if ($servidorUserId !== null) {
            Avaliacao::query()
                ->where('servidor_id', $servidorUserId)
                ->when($pendencia->ciclo_id !== null, fn ($q) => $q->where('ciclo_id', $pendencia->ciclo_id))
                ->where('homologada', false)
                ->update(['avaliador_id' => $validated['avaliador_designado_id']]);
        }

        $this->audit->record(
            'capd',
            'pendencia_hierarquia.resolvida',
            "PendenciaHierarquia #{$id}",
            null,
            ['avaliador_designado_id' => $validated['avaliador_designado_id']]
        );

        return response()->json($pendencia->fresh());
    }
}
