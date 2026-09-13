<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Services\CalculadoraNotaService;
use Modules\Capd\Services\IngestaoAutomaticaService;

/**
 * Avaliação de Desempenho — CAPD.
 *
 * Endpoints:
 *   GET    /api/v1/capd/avaliacoes                    → lista do avaliador
 *   GET    /api/v1/capd/avaliacoes/{id}               → detalhe com nota e detalhamento
 *   POST   /api/v1/capd/avaliacoes                    → cria ou reabre rascunho
 *   PUT    /api/v1/capd/avaliacoes/{id}               → atualiza respostas (rascunho)
 *   POST   /api/v1/capd/avaliacoes/{id}/submeter      → submete avaliação (cálculo final + trava)
 *   POST   /api/v1/capd/avaliacoes/{id}/ciencia       → registra ciência do servidor
 *   POST   /api/v1/capd/avaliacoes/{id}/homologar     → CAPD homologa (imutabilidade RN-C07)
 *   GET    /api/v1/capd/avaliacoes/{id}/preview-nota  → prévia da nota sem submeter
 */
final class AvaliacaoController extends Controller
{
    public function __construct(
        private readonly CalculadoraNotaService    $calculadora,
        private readonly IngestaoAutomaticaService $ingestao,
        private readonly AuditLogger               $audit,
    ) {}

    // ── GET /avaliacoes ───────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        $query = Avaliacao::with(['ciclo:id,nome,ano_referencia', 'recursos'])
            ->where('avaliador_id', $avaliador->id);

        if ($cicloId = $request->query('ciclo_id')) {
            $query->where('ciclo_id', (int) $cicloId);
        }

        if ($status = $request->query('status')) {
            match ($status) {
                'homologada' => $query->where('homologada', true),
                'pendente'   => $query->where('homologada', false),
                default      => null,
            };
        }

        return response()->json(
            $query->latest('updated_at')->paginate((int) $request->query('per_page', 25))
        );
    }

    // ── GET /avaliacoes/{id} ──────────────────────────────────────────

    public function show(int $id): JsonResponse
    {
        $avaliacao = Avaliacao::with(['ciclo', 'recursos.fatorContestado'])
            ->findOrFail($id);

        $this->authorize('view', $avaliacao);

        return response()->json($avaliacao);
    }

    // ── POST /avaliacoes ──────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        $validated = $request->validate([
            'ciclo_id'    => ['required', 'integer', 'exists:capd_ciclos,id'],
            'servidor_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        // Garante ciclo em avaliação
        $ciclo = CicloAvaliacao::findOrFail($validated['ciclo_id']);
        abort_if(
            $ciclo->status !== CicloAvaliacao::STATUS_EM_AVALIACAO,
            422,
            'O ciclo não está em período de avaliação.'
        );

        // Previne duplicata (1 avaliação por servidor/ciclo)
        $existente = Avaliacao::where([
            'tenant_id'   => $tenantId,
            'ciclo_id'    => $validated['ciclo_id'],
            'servidor_id' => $validated['servidor_id'],
        ])->first();

        if ($existente) {
            abort_if($existente->homologada, 422, 'Avaliação já homologada para este servidor neste ciclo.');
            return response()->json($existente, 200);
        }

        $avaliacao = Avaliacao::create([
            'tenant_id'           => $tenantId,
            'ciclo_id'            => $validated['ciclo_id'],
            'servidor_id'         => $validated['servidor_id'],
            'avaliador_id'        => $avaliador->id,
            'respostas_fatores'   => [],
            'nota_final'          => '0.00',
            'elegivel_progressao' => false,
            'homologada'          => false,
        ]);

        $this->audit->record('capd', 'avaliacao.created', "Avaliacao #{$avaliacao->id}", null, $avaliacao->toArray());

        return response()->json($avaliacao, 201);
    }

    // ── PUT /avaliacoes/{id} ──────────────────────────────────────────

    /**
     * Salva respostas parciais (rascunho). Não valida travas — isso ocorre no submit.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::findOrFail($id);
        $this->authorize('update', $avaliacao);

        abort_if($avaliacao->homologada, 422, 'Avaliação homologada é imutável (RN-C07).');

        $request->validate([
            'respostas_fatores'       => ['required', 'array'],
            'respostas_fatores.*.grau'=> ['required', 'integer', 'between:1,5'],
        ]);

        $before = $avaliacao->respostas_fatores;
        $avaliacao->update(['respostas_fatores' => $request->respostas_fatores]);

        $this->audit->record('capd', 'avaliacao.draft_updated', "Avaliacao #{$id}", $before, $request->respostas_fatores);

        return response()->json($avaliacao);
    }

    // ── POST /avaliacoes/{id}/submeter ────────────────────────────────

    /**
     * Submete avaliação: aplica travas + calcula NFD definitiva.
     * Em caso de Trava (grau 1/2/5 sem CIT), retorna HTTP 422.
     */
    public function submeter(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::with('ciclo')->findOrFail($id);
        $this->authorize('update', $avaliacao);

        abort_if($avaliacao->homologada, 422, 'Avaliação já homologada não pode ser re-submetida.');

        // ── Ingestão automática de F1 e F2 ───────────────────────────
        $servidor = \DB::table('users')->where('id', $avaliacao->servidor_id)->first();

        $f1f2 = $this->ingestao->calcularF1F2(
            $avaliacao->ciclo,
            $avaliacao->servidor_id,
            $servidor->cpf ?? '',
        );

        // Mescla graus automáticos (F1/F2) nas respostas do avaliador
        $respostas = array_merge($avaliacao->respostas_fatores ?? [], [
            'F1' => ['grau' => $f1f2['F1']['grau'], 'automatizado' => true],
            'F2' => ['grau' => $f1f2['F2']['grau'], 'automatizado' => true],
        ]);

        // ── Busca fatores do tenant ───────────────────────────────────
        $fatores = FatorAvaliacao::get()->keyBy('codigo')
            ->map(fn ($f) => $f->toArray())
            ->toArray();

        // Determina plano do servidor (GERAL ou MAGISTERIO)
        $plano = $this->resolverPlano($avaliacao->servidor_id);

        // ── Cálculo com travas (pode lançar TravaIncidenteCriticoException) ─
        try {
            $resultado = $this->calculadora->calcular(
                respostas:  $respostas,
                fatores:    $fatores,
                plano:      $plano,
                cicloId:    $avaliacao->ciclo_id,
                servidorId: $avaliacao->servidor_id,
            );
        } catch (TravaIncidenteCriticoException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'fator'   => $e->fator,
                'error'   => 'trava_cit',
            ], 422);
        }

        $avaliacao->update([
            'respostas_fatores'   => $respostas,
            'nota_final'          => $resultado['nota_final'],
            'elegivel_progressao' => $resultado['elegivel_progressao'],
            'data_conclusao'      => now(),
        ]);

        $this->audit->record(
            'capd',
            'avaliacao.submetida',
            "Avaliacao #{$id} — NFD {$resultado['nota_final']}",
            null,
            ['nota_final' => $resultado['nota_final'], 'elegivel' => $resultado['elegivel_progressao'], 'detalhamento' => $resultado['detalhamento']],
        );

        return response()->json([
            'avaliacao'   => $avaliacao->fresh(),
            'resultado'   => $resultado,
            'f1_f2'       => $f1f2,
        ]);
    }

    // ── POST /avaliacoes/{id}/ciencia ─────────────────────────────────

    /**
     * Registra ciência do servidor avaliado (via token de acesso único ou login).
     */
    public function registrarCiencia(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::findOrFail($id);

        // Servidor deve ser o próprio usuário autenticado
        abort_if(
            $request->user()->id !== $avaliacao->servidor_id,
            403,
            'Somente o servidor avaliado pode registrar a ciência.'
        );

        abort_if(
            $avaliacao->data_conclusao === null,
            422,
            'A avaliação ainda não foi submetida pelo avaliador.'
        );

        abort_if(
            $avaliacao->ciencia_servidor_em !== null,
            422,
            'Ciência já registrada em ' . $avaliacao->ciencia_servidor_em->format('d/m/Y H:i') . '.'
        );

        $avaliacao->update(['ciencia_servidor_em' => now()]);

        $this->audit->record('capd', 'avaliacao.ciencia', "Avaliacao #{$id} — ciência do servidor", null, ['em' => now()->toIso8601String()]);

        return response()->json([
            'message'              => 'Ciência registrada com sucesso.',
            'ciencia_servidor_em'  => $avaliacao->ciencia_servidor_em,
        ]);
    }

    // ── POST /avaliacoes/{id}/homologar ───────────────────────────────

    /**
     * CAPD homologa a avaliação → torna-a imutável (RN-C07).
     * Exige: avaliação submetida + ciência do servidor + sem recursos pendentes.
     */
    public function homologar(Request $request, int $id): JsonResponse
    {
        $this->authorize('homologar', Avaliacao::class);

        $avaliacao = Avaliacao::findOrFail($id);

        abort_if($avaliacao->homologada, 422, 'Avaliação já homologada.');
        abort_if($avaliacao->data_conclusao === null, 422, 'Avaliação ainda não foi submetida.');
        abort_if($avaliacao->ciencia_servidor_em === null, 422, 'Avaliação aguarda ciência do servidor.');
        abort_if($avaliacao->possuiRecursoPendente(), 422, 'Existem recursos pendentes de julgamento para esta avaliação.');

        $avaliacao->update([
            'homologada'    => true,
            'homologada_em' => now(),
            'homologada_por'=> $request->user()->id,
        ]);

        $this->audit->record('capd', 'avaliacao.homologada', "Avaliacao #{$id} — NFD {$avaliacao->nota_final}", null, ['por' => $request->user()->id]);

        return response()->json([
            'message'       => 'Avaliação homologada com sucesso.',
            'avaliacao'     => $avaliacao->fresh(),
        ]);
    }

    // ── GET /avaliacoes/{id}/preview-nota ─────────────────────────────

    /**
     * Calcula prévia da nota sem salvar (sem travas).
     * Usado pelo frontend para dar feedback visual ao avaliador.
     */
    public function previewNota(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::with('ciclo')->findOrFail($id);
        $this->authorize('view', $avaliacao);

        $request->validate([
            'respostas_fatores'       => ['required', 'array'],
            'respostas_fatores.*.grau'=> ['required', 'integer', 'between:1,5'],
        ]);

        $fatores = FatorAvaliacao::get()->keyBy('codigo')
            ->map(fn ($f) => $f->toArray())
            ->toArray();

        $plano = $this->resolverPlano($avaliacao->servidor_id);

        // Preview sem travas — usa stub permissivo
        $calculadoraSemTrava = new \Modules\Capd\Services\CalculadoraNotaService(
            new class extends \Modules\Capd\Services\TravaElectronicaService {
                public function validar(string $fatorCodigo, int $cicloId, int $servidorId, int $fatorId): void {}
            }
        );

        // Adiciona F1/F2 automatizados para a prévia
        $respostas = array_merge($request->respostas_fatores, [
            'F1' => ['grau' => 3, 'automatizado' => true],
            'F2' => ['grau' => 3, 'automatizado' => true],
        ]);

        $resultado = $calculadoraSemTrava->calcular($respostas, $fatores, $plano, $avaliacao->ciclo_id, $avaliacao->servidor_id);

        return response()->json([
            'preview'   => true,
            'resultado' => $resultado,
            'aviso'     => 'F1 e F2 usam valores placeholder (grau 3). O cálculo definitivo usa dados reais do RH.',
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function resolverPlano(int $servidorId): string
    {
        // Determina plano pela matrícula/vínculo do servidor
        // TODO: integrar com tabela de servidores quando disponível
        $planoId = \DB::table('users')->where('id', $servidorId)->value('plano_carreira_id');
        $plano   = \DB::table('capd_planos_carreira')->where('id', $planoId)->value('codigo');

        return match ($plano) {
            'MAGISTERIO' => 'MAGISTERIO',
            default      => 'GERAL',
        };
    }
}
