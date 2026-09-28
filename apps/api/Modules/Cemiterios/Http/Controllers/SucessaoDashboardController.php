<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\EstadoSucessao;

final class SucessaoDashboardController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function pendentes(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $tenantId = $request->user()->tenant_id ?? $request->header('X-Tenant-Id');
        $parkId = $request->query('park_id');

        $processos = $this->sucessao->getPendentes((int) $tenantId, $parkId ? (int) $parkId : null);

        // Agrupa por estado
        $resumo = [
            'em_analise' => $processos->where('estado', EstadoSucessao::EmAnalise->value)->count(),
            'aguardando_documentos' => $processos->where('estado', EstadoSucessao::AguardandoDocumentos->value)->count(),
            'validada' => $processos->where('estado', EstadoSucessao::Validada->value)->count(),
            'total' => $processos->count(),
        ];

        return response()->json([
            'resumo' => $resumo,
            'processos' => $processos->toBase()->map(function ($p) {
                /** @var Sucessao $p */
                return [
                    'id' => $p->id,
                    'processo_referencia' => $p->processo_referencia,
                    'estado' => $p->estado->value,
                    'via' => $p->via->value,
                    'concessao' => $p->concessao?->only(['id', 'numero']),
                    'jazigo' => $p->concessao?->jazigo?->only(['id', 'codigo']),
                    'cemiterio' => $p->concessao?->jazigo?->cemiterio?->only(['id', 'nome']),
                    'titular_falecido' => $p->titularFalecido?->only(['id', 'nome']),
                    'data_falecimento' => $p->data_falecimento?->toIso8601String(),
                    'dias_em_analise' => $p->created_at?->diffInDays(now()),
                    'herdeiros_count' => $p->herdeiros->count(),
                    'documentos_count' => $p->documentos->count(),
                    'documentos_pendentes' => $this->getDocumentosPendentes($p),
                ];
            }),
        ]);
    }

    public function regularizacao(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $tenantId = $request->user()->tenant_id ?? $request->header('X-Tenant-Id');
        $parkId = $request->query('park_id');

        $processos = $this->sucessao->getRegularizacao((int) $tenantId, $parkId ? (int) $parkId : null);

        return response()->json([
            'total' => $processos->count(),
            'processos' => $processos->map(function ($p) {
                $diasFalecimento = $p->data_falecimento?->diffInDays(now()) ?? 0;
                $prazoRegularizacao = 120; // default, deveria vir do config
                $diasRestantes = max(0, $prazoRegularizacao - $diasFalecimento);

                return [
                    'id' => $p->id,
                    'processo_referencia' => $p->processo_referencia,
                    'estado' => $p->estado->value,
                    'via' => $p->via->value,
                    'concessao' => $p->concessao?->only(['id', 'numero']),
                    'jazigo' => $p->concessao?->jazigo?->only(['id', 'codigo']),
                    'cemiterio' => $p->concessao?->jazigo?->cemiterio?->only(['id', 'nome']),
                    'titular_falecido' => $p->titularFalecido?->only(['id', 'nome']),
                    'data_falecimento' => $p->data_falecimento?->toIso8601String(),
                    'dias_desde_falecimento' => $diasFalecimento,
                    'dias_restantes_regularizacao' => $diasRestantes,
                    'prazo_vencido' => $diasRestantes === 0,
                    'herdeiros_count' => $p->herdeiros->count(),
                    'titular_indicado' => $p->herdeiros->where('titular_indicado', true)->first()?->only(['id', 'nome']),
                ];
            }),
        ]);
    }

    private function getDocumentosPendentes(Sucessao $sucessao): array
    {
        $config = app(\Modules\Cemiterios\Services\SucessaoConfigService::class);
        $obrigatorios = $config->getDocumentosPorVia();
        $via = $sucessao->via->value;

        if (!isset($obrigatorios[$via])) {
            return [];
        }

        $existentes = $sucessao->documentos->pluck('tipo')->map(fn ($t) => $t->value)->toArray();

        return array_values(array_filter($obrigatorios[$via], fn ($tipo) => !in_array($tipo->value, $existentes)));
    }
}