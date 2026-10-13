<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Enums\StatusTransferencia;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Services\ParametrosService;
use Modules\Inservivel\Services\ValidadeDocumentoService;
use Modules\Inservivel\Support\FormataBem;

/** Dashboard do módulo (spec: Dashboard; Validade dos documentos da entidade). */
final class DashboardController extends Controller
{
    public function __construct(
        private readonly ParametrosService $parametros,
        private readonly ValidadeDocumentoService $validade,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Bem::class);
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'situacao_id' => ['nullable', 'integer'],
            'secretaria_unit_id' => ['nullable', 'integer'],
        ]);
        $veEntidades = Gate::allows('viewAny', Entidade::class);
        $veSolicitacoes = Gate::allows('aprovarQualquer', Transferencia::class);
        $alertas = $veEntidades ? $this->validade->alertas() : [];

        $ultimos = Bem::query()->with(['situacao', 'estadoConservacao', 'categoria', 'secretaria', 'setor', 'fotoPrincipal'])
            ->when(!empty($filtros['q']), fn ($q) => $q->where(fn ($w) => $w->where('numero_patrimonial', 'like', '%' . $filtros['q'] . '%')->orWhere('descricao', 'like', '%' . $filtros['q'] . '%')))
            ->when(!empty($filtros['situacao_id']), fn ($q) => $q->where('situacao_id', (int) $filtros['situacao_id']))
            ->when(!empty($filtros['secretaria_unit_id']), fn ($q) => $q->where('secretaria_unit_id', (int) $filtros['secretaria_unit_id']))
            ->latest('id')->limit(20)->get();

        return response()->json([
            'indicadores' => [
                'bens' => Bem::query()->count(),
                'bens_em_avaliacao' => Bem::query()->where('situacao_id', $this->parametros->idDoPapel(PapelSituacao::EmAvaliacao))->count(),
                'bens_inserviveis' => Bem::query()->where('situacao_id', $this->parametros->idDoPapel(PapelSituacao::Inservivel))->count(),
                'lotes_ativos' => Lote::query()->whereIn('status', [StatusLote::Aberto, StatusLote::Publicado])->count(),
                'entidades' => Entidade::query()->count(),
                'entidades_aguardando' => Entidade::query()->whereIn('status', [StatusEntidade::Pendente, StatusEntidade::EmAnalise])->count(),
                'alertas_documentos' => count($alertas),
            ],
            'ultimos_bens' => $ultimos->map(fn (Bem $b): array => FormataBem::resumo($b)),
            'entidades_aguardando' => $veEntidades
                ? Entidade::query()->whereIn('status', [StatusEntidade::Pendente, StatusEntidade::EmAnalise])->orderBy('id')->limit(10)->get()
                    ->map(fn (Entidade $e): array => ['id' => $e->id, 'razao_social' => $e->razao_social, 'status' => $e->status->value, 'status_rotulo' => $e->status->rotulo()])
                : [],
            'alertas_documentos' => $alertas,
            'solicitacoes_pendentes' => $veSolicitacoes ? Transferencia::query()->where('status', StatusTransferencia::Solicitado)->count() : null,
        ]);
    }
}
