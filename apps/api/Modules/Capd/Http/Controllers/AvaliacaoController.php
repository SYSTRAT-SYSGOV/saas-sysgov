<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use App\Models\AuditLog;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\CalculadoraNotaService;
use Modules\Capd\Services\HierarquiaService;
use Modules\Capd\Services\IngestaoAutomaticaService;
use Modules\Capd\Services\PerguntaService;
use Modules\Capd\Services\QuinquenioService;

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
        private readonly HierarquiaService         $hierarquia,
        private readonly QuinquenioService         $quinquenioService,
        private readonly PerguntaService           $perguntaService,
    ) {}

    // ── GET /avaliacoes ───────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        $query = Avaliacao::with([
            'ciclo:id,nome,ano_referencia',
            'servidor:id,name,email',
            'servidorData',
            'avaliador:id,name,email',
        ])->select([
            'id',
            'tenant_id',
            'ciclo_id',
            'servidor_id',
            'avaliador_id',
            'periodo_inicio',
            'periodo_fim',
            'dias_exercicio',
            'nota_final',
            'elegivel_progressao',
            'data_conclusao',
            'ciencia_servidor_em',
            'devolutiva_realizada',
            'devolutiva_em',
            'devolutiva_resumo',
            'devolutiva_acordos',
            'devolutiva_por',
            'homologada',
            'homologada_em',
            'homologada_por',
            'created_at',
            'updated_at',
        ]);

        if ($request->filled('avaliador_id')) {
            $query->where('avaliador_id', (int) $request->query('avaliador_id'));
        } else {
            $isAdminOrGestor = $avaliador && (
                $avaliador->is_platform_admin ||
                collect(['admin_tenant', 'admin', 'gestor_rh', 'root', 'comissao_capd'])->some(fn ($r) => $avaliador->hasRole($r))
            );

            if (! $isAdminOrGestor) {
                // Se for avaliador com atribuições, filtra as dele; se não tiver nenhuma, não trava query vazia
                $temAvaliacoes = Avaliacao::where('avaliador_id', $avaliador->id)->exists();
                if ($temAvaliacoes) {
                    $query->where('avaliador_id', $avaliador->id);
                }
            }
        }

        if ($cicloId = $request->query('ciclo_id')) {
            $query->where('ciclo_id', (int) $cicloId);
        }

        if ($servidorId = $request->query('servidor_id')) {
            $query->where('servidor_id', (int) $servidorId);
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

    // ── GET /avaliacoes/kpis-equipe ────────────────────────────────────

    /**
     * KPIs consolidados da equipe do avaliador autenticado (ou de toda a
     * organização, se admin/gestor). Mesmo escopo de index().
     */
    public function kpisEquipe(Request $request): JsonResponse
    {
        $avaliador = $request->user();

        $cicloId = $request->query('ciclo_id') ? (int) $request->query('ciclo_id') : null;
        $ciclo = $cicloId
            ? CicloAvaliacao::find($cicloId)
            : CicloAvaliacao::query()->ativo()->latest('id')->first();

        $distribuicaoVazia = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];

        if (! $ciclo) {
            return response()->json([
                'total_equipe'       => 0,
                'pendentes'          => 0,
                'concluidas'         => 0,
                'nota_media'         => '0.00',
                'distribuicao_graus' => $distribuicaoVazia,
            ]);
        }

        $query = Avaliacao::where('ciclo_id', $ciclo->id);

        $isAdminOrGestor = $avaliador && (
            $avaliador->is_platform_admin ||
            collect(['admin_tenant', 'admin', 'gestor_rh', 'root', 'comissao_capd'])->some(fn ($r) => $avaliador->hasRole($r))
        );

        if ($request->filled('avaliador_id')) {
            $query->where('avaliador_id', (int) $request->query('avaliador_id'));
        } elseif (! $isAdminOrGestor) {
            $query->where('avaliador_id', $avaliador->id);
        }

        $avaliacoes = $query->get(['id', 'servidor_id', 'data_conclusao', 'nota_final', 'respostas_fatores']);
        $concluidas = $avaliacoes->whereNotNull('data_conclusao');

        $distribuicao = $distribuicaoVazia;
        foreach ($concluidas as $av) {
            foreach ((array) $av->respostas_fatores as $resposta) {
                $grau = $resposta['grau'] ?? null;
                if ($grau && isset($distribuicao[(string) $grau])) {
                    $distribuicao[(string) $grau]++;
                }
            }
        }

        return response()->json([
            'total_equipe'       => $avaliacoes->pluck('servidor_id')->unique()->count(),
            'pendentes'          => $avaliacoes->count() - $concluidas->count(),
            'concluidas'         => $concluidas->count(),
            'nota_media'         => $concluidas->count() > 0
                ? number_format((float) $concluidas->avg('nota_final'), 2, '.', '')
                : '0.00',
            'distribuicao_graus' => $distribuicao,
        ]);
    }

    // ── GET /avaliacoes/{id} ──────────────────────────────────────────

    public function show(int $id): JsonResponse
    {
        $avaliacao = Avaliacao::with([
            'ciclo',
            'servidor:id,name,email',
            'servidorData',
            'avaliador:id,name,email',
            'recursos.fatorContestado',
        ])->findOrFail($id);

        $this->authorize('view', $avaliacao);

        // Pré-carrega incidentes CIT para o formulário responder instantaneamente
        $incidentes = DiarioBordo::with(['fator:id,codigo,nome', 'evidencias'])
            ->where('tenant_id', $avaliacao->tenant_id)
            ->where('servidor_id', $avaliacao->servidor_id)
            ->where('ciclo_id', $avaliacao->ciclo_id)
            ->latest('data_ocorrencia')
            ->get();

        $avaliacao->setAttribute('incidentes_cit', $incidentes);

        return response()->json($avaliacao);
    }

    // ── POST /avaliacoes ──────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Avaliacao::class);

        $tenantId = (int) app(TenantContext::class)->id();

        $validated = $request->validate([
            'ciclo_id'    => ['required', 'integer', 'exists:capd_ciclos,id'],
            'servidor_id' => ['required', 'integer'],
        ]);

        // Garante ciclo em avaliação ou aberto
        $ciclo = CicloAvaliacao::findOrFail($validated['ciclo_id']);
        abort_if(
            ! in_array($ciclo->status, [CicloAvaliacao::STATUS_EM_AVALIACAO, CicloAvaliacao::STATUS_ABERTO], true),
            422,
            'O ciclo não está em período de avaliação.'
        );

        // Se o ciclo estava como aberto, atualiza para em_avaliacao
        if ($ciclo->status === CicloAvaliacao::STATUS_ABERTO) {
            $ciclo->update(['status' => CicloAvaliacao::STATUS_EM_AVALIACAO]);
        }

        $servidor = Servidor::query()->where('user_id', $validated['servidor_id'])->first()
            ?? Servidor::query()->find($validated['servidor_id']);

        abort_if($servidor === null, 422, 'Servidor não possui cadastro no módulo CAPD.');

        $targetUserId = (int) ($servidor->user_id ?: $validated['servidor_id']);

        // Previne duplicata (1 avaliação integral por servidor/ciclo)
        $existente = Avaliacao::where([
            'tenant_id'      => $tenantId,
            'ciclo_id'       => $validated['ciclo_id'],
            'servidor_id'    => $targetUserId,
            'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
        ])->first();

        if ($existente) {
            abort_if($existente->homologada, 422, 'Avaliação já homologada para este servidor neste ciclo.');
            return response()->json($existente, 200);
        }

        // Transferência de unidade no meio do ciclo: divide em avaliações parciais + consolidada.
        $this->hierarquia->dividirPorTransferencia($servidor, $ciclo);

        $consolidada = Avaliacao::where([
            'tenant_id'      => $tenantId,
            'ciclo_id'       => $validated['ciclo_id'],
            'servidor_id'    => $targetUserId,
            'tipo_avaliacao' => Avaliacao::TIPO_CONSOLIDADA,
        ])->first();

        if ($consolidada !== null) {
            return response()->json($consolidada, 201);
        }

        $resolvido = $this->hierarquia->resolverAvaliador($servidor, now());

        $avaliadorId = null;
        if (! $resolvido->pendente && $resolvido->userId) {
            $avaliadorId = $resolvido->userId;
        } elseif ($request->user() && ($request->user()->hasRole('avaliador') || $request->user()->hasRole('admin_tenant') || $request->user()->is_platform_admin)) {
            $avaliadorId = $request->user()->id;
        } elseif ($servidor->chefiaImediata?->user_id) {
            $avaliadorId = $servidor->chefiaImediata->user_id;
        }

        abort_if(
            $avaliadorId === null && $resolvido->pendente,
            422,
            'Não foi possível resolver o superior imediato do servidor. Pendência encaminhada ao DRH.'
        );

        $avaliadorId = $avaliadorId ?: $resolvido->userId;

        $avaliacao = Avaliacao::create([
            'tenant_id'           => $tenantId,
            'ciclo_id'            => $validated['ciclo_id'],
            'servidor_id'         => $targetUserId,
            'avaliador_id'        => $avaliadorId,
            'tipo_avaliacao'      => Avaliacao::TIPO_INTEGRAL,
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
        $this->authorize('avaliar', $avaliacao);

        abort_if($avaliacao->homologada, 422, 'Avaliação homologada é imutável (RN-C07).');

        $respostasFatores = $request->input('respostas_fatores', []);
        if (is_array($respostasFatores)) {
            foreach ($respostasFatores as $cod => &$item) {
                if (is_array($item)) {
                    if (isset($item['diario_bordo_id']) && (empty($item['diario_bordo_id']) || ! is_numeric($item['diario_bordo_id']))) {
                        unset($item['diario_bordo_id']);
                    }
                    if (isset($item['grau']) && (empty($item['grau']) || ! is_numeric($item['grau']))) {
                        unset($item['grau']);
                    }
                }
            }
            unset($item);
            $request->merge(['respostas_fatores' => $respostasFatores]);
        }

        $request->validate([
            'respostas_fatores'                  => ['required', 'array'],
            'respostas_fatores.*.grau'            => ['nullable', 'integer', 'between:1,5'],
            'respostas_fatores.*.diario_bordo_id' => ['nullable', 'integer', 'exists:capd_diario_bordo,id'],
        ]);

        $before = $avaliacao->respostas_fatores;

        $graus = [];
        if (is_array($request->respostas_fatores)) {
            foreach ($request->respostas_fatores as $item) {
                if (isset($item['grau']) && is_numeric($item['grau'])) {
                    $graus[] = (float) $item['grau'];
                }
            }
        }

        $dadosUpdate = ['respostas_fatores' => $request->respostas_fatores];
        if (count($graus) > 0 && ! $avaliacao->homologada) {
            $modelo = $avaliacao->modeloFormulario;
            if (! $modelo) {
                $servidor = Servidor::where('user_id', $avaliacao->servidor_id)->first();
                $modelo = $this->perguntaService->getModeloVigente($servidor?->plano_carreira_id);
            }

            $somaPonderada = 0.0;
            $somaPesos = 0.0;

            if ($modelo) {
                $servidor = Servidor::where('user_id', $avaliacao->servidor_id)->first();
                $fatoresPesos = $modelo->fatoresComPesosEfetivos($servidor?->atende_publico ?? true);
                foreach ($fatoresPesos as $mfp) {
                    $cod = $mfp->fator?->codigo;
                    if ($cod && isset($request->respostas_fatores[$cod]['grau']) && is_numeric($request->respostas_fatores[$cod]['grau'])) {
                        $g = (float) $request->respostas_fatores[$cod]['grau'];
                        $p = (float) $mfp->peso;
                        $somaPonderada += ($g * 20.0) * $p;
                        $somaPesos += $p;
                    }
                }
            }

            if ($somaPesos > 0) {
                $notaFinal = round($somaPonderada / $somaPesos, 2);
            } else {
                $mediaGraus = array_sum($graus) / count($graus);
                $notaFinal = round($mediaGraus * 20, 2);
            }

            $dadosUpdate['nota_final'] = number_format($notaFinal, 2, '.', '');
            $dadosUpdate['elegivel_progressao'] = (float) $notaFinal >= 70.0;
        }

        $avaliacao->update($dadosUpdate);

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
        $this->authorize('avaliar', $avaliacao);

        abort_if($avaliacao->homologada, 422, 'Avaliação já homologada não pode ser re-submetida.');

        // ── Ingestão automática de F1 e F2 ───────────────────────────
        $servidorUser = \DB::table('users')->where('id', $avaliacao->servidor_id)->first();

        $f1f2 = $this->ingestao->calcularF1F2(
            $avaliacao->ciclo,
            $avaliacao->servidor_id,
            $servidorUser->cpf ?? '',
        );

        // Mescla graus automáticos (F1/F2) nas respostas do avaliador
        $respostas = array_merge($avaliacao->respostas_fatores ?? [], [
            'F1' => ['grau' => $f1f2['F1']['grau'], 'automatizado' => true],
            'F2' => ['grau' => $f1f2['F2']['grau'], 'automatizado' => true],
        ]);

        // ── Resolve o modelo de formulário vigente do servidor (RF-02) ────
        $servidor = Servidor::where('user_id', $avaliacao->servidor_id)->first();
        $modelo   = $this->perguntaService->getModeloVigente($servidor?->plano_carreira_id);

        if ($modelo === null) {
            return response()->json([
                'message' => 'Nenhum modelo de formulário vigente configurado para este servidor.',
                'error'   => 'modelo_nao_encontrado',
            ], 422);
        }

        $fatoresPesos = $modelo->fatoresComPesosEfetivos($servidor?->atende_publico ?? true);

        // ── Cálculo com travas (pode lançar TravaIncidenteCriticoException) ─
        try {
            $resultado = $this->calculadora->calcular(
                respostas:    $respostas,
                fatoresPesos: $fatoresPesos,
                cicloId:      $avaliacao->ciclo_id,
                servidorId:   $avaliacao->servidor_id,
            );
        } catch (TravaIncidenteCriticoException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'fator'   => $e->fator,
                'error'   => 'trava_cit',
            ], 422);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage(), 'error' => 'modelo_sem_pesos'], 422);
        }

        $avaliacao->update([
            'respostas_fatores'    => $respostas,
            'modelo_formulario_id' => $modelo->id,
            'nota_final'           => $resultado['nota_final'],
            'elegivel_progressao'  => $resultado['elegivel_progressao'],
            'data_conclusao'       => now(),
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
     * Registra ciência do servidor avaliado com data/hora UTC-3, IP e tipo (concordância ou inconformidade para recurso).
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

        if ($avaliacao->ciencia_servidor_em !== null) {
            abort(422, 'Ciência já registrada em ' . $avaliacao->ciencia_servidor_em->format('d/m/Y H:i') . '.');
        }

        $dados = $request->validate([
            'tipo'        => ['nullable', 'string', 'in:concordancia,discordancia_recurso'],
            'observacoes' => ['nullable', 'string', 'max:1000'],
        ]);

        $ip = $request->ip();
        $tipo = $dados['tipo'] ?? 'concordancia';

        $avaliacao->update([
            'ciencia_servidor_em' => now(),
            'ciencia_ip'          => $ip,
            'ciencia_tipo'        => $tipo,
        ]);

        $hashAcao = hash('sha256', "ciencia:{$id}:{$request->user()->id}:{$tipo}:" . now()->toIso8601String());

        $this->audit->record(
            'capd',
            'avaliacao.ciencia',
            "Avaliação #{$id} — ciência do servidor ({$tipo})",
            null,
            [
                'avaliacao_id' => $id,
                'servidor_id'  => $request->user()->id,
                'tipo'         => $tipo,
                'ip'           => $ip,
                'hash_sha256'  => $hashAcao,
                'timestamp'    => now()->toIso8601String(),
            ]
        );

        return response()->json([
            'message'             => 'Ciência registrada com sucesso.',
            'ciencia_servidor_em' => $avaliacao->ciencia_servidor_em,
            'ciencia_tipo'        => $tipo,
            'ciencia_ip'          => $ip,
            'hash_sha256'         => $hashAcao,
        ]);
    }

    /**
     * Registra formalmente a realização de Devolutiva Presencial (Art. 27).
     */
    public function registrarDevolutiva(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::findOrFail($id);
        $this->authorize('update', $avaliacao);

        $dados = $request->validate([
            'data_devolutiva'         => ['required', 'date'],
            'resumo_entrevista'       => ['nullable', 'string', 'max:1000'],
            'acordos_desenvolvimento' => ['nullable', 'string', 'max:1000'],
        ]);

        $ip = $request->ip();

        $avaliacao->update([
            'devolutiva_realizada' => true,
            'devolutiva_em'        => $dados['data_devolutiva'],
            'devolutiva_resumo'    => $dados['resumo_entrevista'] ?? null,
            'devolutiva_acordos'   => $dados['acordos_desenvolvimento'] ?? null,
            'devolutiva_por'       => $request->user()->id,
        ]);

        $hashAcao = hash('sha256', "devolutiva:{$id}:{$request->user()->id}:" . now()->toIso8601String());

        $this->audit->record(
            'capd',
            'avaliacao.devolutiva',
            "Devolutiva presencial registrada para Avaliação #{$id}",
            null,
            [
                'avaliacao_id'   => $id,
                'devolutiva_em'  => $dados['data_devolutiva'],
                'registrado_por' => $request->user()->id,
                'ip'             => $ip,
                'hash_sha256'    => $hashAcao,
                'timestamp'      => now()->toIso8601String(),
            ]
        );

        return response()->json([
            'message'   => 'Devolutiva presencial registrada com sucesso.',
            'avaliacao' => $avaliacao->fresh(),
        ]);
    }

    /**
     * Espelho individual da avaliação para o Portal do Servidor Avaliado.
     */
    public function obterEspelho(Request $request, int $id): JsonResponse
    {
        $avaliacao = Avaliacao::with(['ciclo', 'servidor', 'servidorData', 'avaliador', 'modeloFormulario.fatoresPesos.fator'])->findOrFail($id);
        $this->authorize('view', $avaliacao);

        $tenant = app(\App\Support\TenantContext::class)->get();
        $orgaoNome = $tenant?->name ?? 'PREFEITURA MUNICIPAL DE ARAUCÁRIA';
        $orgaoEstado = 'ESTADO DO PARANÁ';

        // RF-02: o peso exibido no espelho deve ser o peso efetivamente configurado
        // no modelo de formulário vigente (ModeloFatorPeso), não um valor fictício —
        // FatorAvaliacao não possui campo "peso_padrao".
        $modeloFormulario = $avaliacao->modeloFormulario;
        $fatoresPesosModelo = $modeloFormulario !== null ? $modeloFormulario->fatoresPesos : collect();
        $pesosPorCodigo = $fatoresPesosModelo
            ->keyBy(fn (\Modules\Capd\Models\ModeloFatorPeso $mfp) => $mfp->fator?->codigo)
            ->map(fn (\Modules\Capd\Models\ModeloFatorPeso $mfp) => (float) $mfp->peso);

        $fatoresDetalhados = [];
        $respostas = $avaliacao->respostas_fatores ?? [];

        $conceitoPorGrau = [
            1 => 'Insatisfatório',
            2 => 'Regular',
            3 => 'Bom',
            4 => 'Ótimo',
            5 => 'Excelente',
        ];

        foreach ($respostas as $key => $info) {
            $cod = is_array($info) && isset($info['codigo']) ? $info['codigo'] : (is_string($key) ? $key : null);
            if (! $cod && is_array($info) && isset($info['fator_codigo'])) {
                $cod = $info['fator_codigo'];
            }
            if (! $cod) {
                $cod = (string) $key;
            }

            $grau = is_array($info) ? ($info['grau'] ?? null) : null;
            $fator = FatorAvaliacao::where('codigo', $cod)->first();

            $fatoresDetalhados[] = [
                'codigo'       => $cod,
                'nome'         => $fator?->nome ?? (is_array($info) && isset($info['nome']) ? $info['nome'] : $cod),
                'descricao'    => $fator?->descricao ?? (is_array($info) ? ($info['descricao'] ?? null) : null),
                'grau'         => $grau,
                'conceito'     => $grau ? ($conceitoPorGrau[$grau] ?? null) : null,
                'nota'         => is_array($info) ? ($info['nota'] ?? $info['pontos'] ?? $grau ?? null) : $info,
                'peso'         => $pesosPorCodigo->get($cod) ?? 0.0,
                'justificativa'=> is_array($info) ? ($info['justificativa'] ?? null) : null,
            ];
        }

        if (empty($fatoresDetalhados)) {
            $fatoresPadrao = FatorAvaliacao::orderBy('codigo')->get();
            foreach ($fatoresPadrao as $fator) {
                $fatoresDetalhados[] = [
                    'codigo'        => $fator->codigo,
                    'nome'          => $fator->nome,
                    'descricao'     => $fator->descricao,
                    'grau'          => null,
                    'conceito'      => null,
                    'nota'          => null,
                    'peso'          => $pesosPorCodigo->get($fator->codigo) ?? 0.0,
                    'justificativa' => null,
                ];
            }
        }

        // ── RF-12: registros do Diário de Bordo (CIT) do servidor neste ciclo ──
        $registrosCit = DiarioBordo::with('evidencias')
            ->where('servidor_id', $avaliacao->servidor_id)
            ->where('ciclo_id', $avaliacao->ciclo_id)
            ->orderBy('data_ocorrencia')
            ->get()
            ->map(fn (DiarioBordo $d) => [
                'id'                => $d->id,
                'fator_codigo'      => $d->fator?->codigo,
                'tipo'              => $d->tipo,
                'data_ocorrencia'   => $d->data_ocorrencia,
                'descricao_fato'    => $d->descricao_fato,
                'evidencias_hashes' => $d->evidencias->pluck('hash_sha256')->filter()->values(),
            ]);

        // ── RF-12: assinatura digital da ciência do servidor (hash do log de auditoria) ──
        $assinaturaCiencia = null;
        if ($avaliacao->ciencia_servidor_em !== null) {
            $logCiencia = AuditLog::where('module', 'capd')
                ->where('action', 'avaliacao.ciencia')
                ->whereJsonContains('after->avaliacao_id', $avaliacao->id)
                ->latest('id')
                ->first();

            $assinaturaCiencia = [
                'tipo'        => $avaliacao->ciencia_tipo,
                'assinado_em' => $avaliacao->ciencia_servidor_em->toIso8601String(),
                'ip'          => $avaliacao->ciencia_ip,
                'hash_sha256' => $logCiencia?->hash,
            ];
        }

        // ── RF-12: histórico consolidado de avaliações anteriores do servidor ──
        $historicoAnterior = Avaliacao::with('ciclo')
            ->where('servidor_id', $avaliacao->servidor_id)
            ->where('id', '!=', $avaliacao->id)
            ->whereNotNull('data_conclusao')
            ->orderByDesc('data_conclusao')
            ->limit(10)
            ->get()
            ->map(fn (Avaliacao $a) => [
                'avaliacao_id'        => $a->id,
                'ciclo'               => $a->ciclo?->nome,
                'ano_referencia'      => $a->ciclo?->ano_referencia,
                'nota_final'          => $a->nota_final,
                'elegivel_progressao' => $a->elegivel_progressao,
                'homologada'          => $a->homologada,
            ]);

        $anoCiclo = $avaliacao->ciclo?->ano_referencia ?? 2026;
        $notaNum = is_numeric($avaliacao->nota_final) ? (float) $avaliacao->nota_final : 0.0;
        $notaPontos = $notaNum <= 10.0 && $notaNum > 0.0 ? $notaNum * 10.0 : $notaNum;
        $elegivel = $avaliacao->elegivel_progressao || ($notaPontos >= 70.0);

        if ($avaliacao->elegivel_progressao !== $elegivel && ! $avaliacao->homologada) {
            $avaliacao->update(['elegivel_progressao' => $elegivel]);
        }

        $conceitoFuncional = match (true) {
            $notaPontos >= 90.0 => 'EXCELENTE / APTO',
            $notaPontos >= 75.0 => 'BOM / APTO',
            $notaPontos >= 60.0 => 'REGULAR / EM ACOMPANHAMENTO',
            default             => 'INSATISFATÓRIO / INAPTO',
        };

        return response()->json([
            'avaliacao_id'        => $avaliacao->id,
            'protocolo'           => sprintf('#CAPD-%s-%04d', $anoCiclo, $avaliacao->id),
            'orgao'               => [
                'nome'   => $orgaoNome,
                'estado' => $orgaoEstado,
            ],
            'ciclo'               => [
                'id'             => $avaliacao->ciclo?->id,
                'nome'           => $avaliacao->ciclo?->nome,
                'ano_referencia' => $avaliacao->ciclo?->ano_referencia,
            ],
            'servidor'            => [
                'id'        => $avaliacao->servidor?->id,
                'nome'      => $avaliacao->servidorData?->nome ?? $avaliacao->servidor?->name,
                'matricula' => $avaliacao->servidorData?->matricula ?? $avaliacao->servidor?->matricula ?? "SERV-{$avaliacao->servidor_id}",
                'cargo'     => $avaliacao->servidorData?->cargo ?? 'Técnico em Gestão Pública',
            ],
            'avaliador'           => [
                'id'        => $avaliacao->avaliador?->id,
                'nome'      => $avaliacao->avaliador?->name,
                'matricula' => $avaliacao->avaliador?->matricula ?? '32.105-8',
            ],
            'nota_final'          => number_format($notaPontos, 2, '.', ''),
            'conceito'            => $conceitoFuncional,
            'elegivel_progressao' => $elegivel,
            'data_conclusao'      => $avaliacao->data_conclusao?->toIso8601String(),
            'ciencia_servidor_em' => $avaliacao->ciencia_servidor_em?->toIso8601String(),
            'ciencia_tipo'        => $avaliacao->ciencia_tipo,
            'devolutiva_realizada'=> $avaliacao->devolutiva_realizada,
            'devolutiva_em'       => $avaliacao->devolutiva_em?->toIso8601String(),
            'devolutiva_resumo'   => $avaliacao->devolutiva_resumo,
            'parecer_avaliador'   => $avaliacao->parecer_avaliador,
            'assinatura_chefia'   => [
                'status' => 'SHA-256 Validado',
                'hash'   => hash('sha256', "capd:avaliacao:{$avaliacao->id}:{$avaliacao->avaliador_id}:{$avaliacao->data_conclusao}"),
                'data'   => $avaliacao->data_conclusao?->toIso8601String(),
            ],
            'fatores'             => $fatoresDetalhados,
            'pode_recorrer'       => $avaliacao->data_conclusao !== null && $avaliacao->ciencia_servidor_em !== null,
            'registros_cit'       => $registrosCit,
            'assinatura_ciencia'  => $assinaturaCiencia,
            'historico_anterior'  => $historicoAnterior,
        ]);
    }

    /**
     * RF-12 — Exporta o Espelho Funcional Individual em PDF.
     * Reaproveita os mesmos dados de obterEspelho() e o padrão Dompdf já
     * usado em ConsolidacaoController::exportarPdf.
     */
    public function exportarEspelhoPdf(Request $request, int $id): Response
    {
        $espelho = json_decode($this->obterEspelho($request, $id)->getContent(), true);

        $html = $this->gerarHtmlEspelho($espelho);

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'portrait');
            return $pdf->download("espelho-funcional-avaliacao-{$id}.pdf");
        }

        return response($html, 200, [
            'Content-Type'        => 'text/html; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"espelho-funcional-avaliacao-{$id}.html\"",
        ]);
    }

    private function gerarHtmlEspelho(array $espelho): string
    {
        $dataGeracao = now()->format('d/m/Y H:i');
        $protocolo = $espelho['protocolo'] ?? "#CAPD-2026-{$espelho['avaliacao_id']}";
        $orgao = ($espelho['orgao']['nome'] ?? 'PREFEITURA MUNICIPAL DE ARAUCÁRIA') . ' — ' . ($espelho['orgao']['estado'] ?? 'ESTADO DO PARANÁ');
        $anoCiclo = $espelho['ciclo']['ano_referencia'] ?? 2026;
        $cargo = $espelho['servidor']['cargo'] ?? 'Técnico em Gestão Pública';
        $conceito = $espelho['conceito'] ?? ($espelho['elegivel_progressao'] ? 'EXCELENTE / APTO' : 'REGULAR / EM ACOMPANHAMENTO');
        $matriculaAvaliador = $espelho['avaliador']['matricula'] ?? '32.105-8';

        $linhasFatores = '';
        foreach ($espelho['fatores'] as $fator) {
            $grau = $fator['grau'] ?? '—';
            $conceitoFator = $fator['conceito'] ?? match ($grau) {
                5 => 'Excelente',
                4 => 'Ótimo',
                3 => 'Bom',
                2 => 'Regular',
                1 => 'Insatisfatório',
                default => '—'
            };
            $justificativa = htmlspecialchars($fator['justificativa'] ?? 'Atendimento regular às expectativas do cargo.', ENT_QUOTES, 'UTF-8');
            $linhasFatores .= "<tr>
                <td style='padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:500;color:#1e293b'>{$fator['codigo']}. {$fator['nome']}</td>
                <td style='padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;font-size:11pt;color:#0f172a'>{$grau}</td>
                <td style='padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#334155;font-weight:500'>{$conceitoFator}</td>
                <td style='padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:8.5pt'>{$justificativa}</td>
            </tr>";
        }

        $cienciaStatus = ! empty($espelho['ciencia_servidor_em'])
            ? 'Ciência do Servidor: Registrada em ' . \Carbon\Carbon::parse($espelho['ciencia_servidor_em'])->format('d/m/Y H:i')
            : 'Ciência do Servidor: Pendente de Assinatura (Prazo 10 dias)';

        return "<!DOCTYPE html>
<html lang='pt-BR'>
<head>
<meta charset='UTF-8'>
<title>Espelho de Avaliação — {$protocolo}</title>
<style>
  @page { margin: 15mm; size: a4 portrait; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; color: #1e293b; line-height: 1.4; margin: 0; padding: 0; }
  .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .orgao-txt { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .doc-title { font-size: 14pt; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; }
  .protocolo-box { float: right; text-align: right; }
  .protocolo-label { font-size: 7.5pt; text-transform: uppercase; color: #64748b; }
  .protocolo-val { font-family: monospace; font-size: 11pt; font-weight: 700; color: #0f172a; }
  .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table td { padding: 4px 6px; font-size: 9pt; vertical-align: top; }
  .meta-label { color: #64748b; font-weight: normal; width: 130px; }
  .meta-val { color: #0f172a; font-weight: 600; }
  .nota-badge { font-family: monospace; font-size: 16pt; font-weight: 800; color: #0f172a; }
  .conceito-chip { display: inline-block; background-color: #dcfce7; color: #166534; font-size: 8pt; font-weight: 700; padding: 3px 10px; border-radius: 9999px; border: 1px solid #bbf7d0; text-transform: uppercase; }
  .main-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .main-table th { background-color: #f8fafc; color: #475569; font-size: 8pt; font-weight: 700; text-transform: uppercase; padding: 8px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  .footer-signatures { margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 8pt; color: #64748b; width: 100%; }
</style>
</head>
<body>
  <div class='header-box'>
    <div class='protocolo-box'>
      <div class='protocolo-label'>Protocolo Digital:</div>
      <div class='protocolo-val'>{$protocolo}</div>
    </div>
    <div class='orgao-txt'>{$orgao}</div>
    <div class='doc-title'>Relatório de Escala Gráfica — CAPD Ciclo {$anoCiclo}</div>
  </div>

  <div class='meta-box'>
    <table class='meta-table'>
      <tr>
        <td class='meta-label'>Servidor:</td>
        <td class='meta-val'>{$espelho['servidor']['nome']}</td>
        <td class='meta-label'>Matrícula:</td>
        <td class='meta-val' style='font-family:monospace'>{$espelho['servidor']['matricula']}</td>
      </tr>
      <tr>
        <td class='meta-label'>Cargo:</td>
        <td class='meta-val'>{$cargo}</td>
        <td class='meta-label'>Chefia Avaliadora:</td>
        <td class='meta-val'>{$espelho['avaliador']['nome']} ({$matriculaAvaliador})</td>
      </tr>
      <tr>
        <td class='meta-label'>Nota Final Média:</td>
        <td class='meta-val'><span class='nota-badge'>{$espelho['nota_final']}</span></td>
        <td class='meta-label'>Conceito Funcional:</td>
        <td class='meta-val'><span class='conceito-chip'>{$conceito}</span></td>
      </tr>
    </table>
  </div>

  <table class='main-table'>
    <thead>
      <tr>
        <th style='width:28%'>Fator Avaliado</th>
        <th style='width:12%;text-align:center'>Grau Atribuído</th>
        <th style='width:16%'>Conceito</th>
        <th style='width:44%'>Evidência / Justificativa</th>
      </tr>
    </thead>
    <tbody>
      {$linhasFatores}
    </tbody>
  </table>

  <table class='footer-signatures'>
    <tr>
      <td style='text-align:left;width:50%'>
        <strong>Assinatura Eletrônica Chefia:</strong> SHA-256 Validado
      </td>
      <td style='text-align:right;width:50%'>
        {$cienciaStatus}
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    /**
     * Simulação de progressão funcional trienal (+10% da referência e quinquênios Art. 17).
     */
    public function simularProgressao(Request $request, int $servidorId): JsonResponse
    {
        $servidor = Servidor::find($servidorId);
        $ciclo = CicloAvaliacao::latest('ano_referencia')->first();

        // Notas históricas dos últimos 3 ciclos
        $avaliacoes = Avaliacao::query()
            ->where('servidor_id', $servidorId)
            ->whereNotNull('data_conclusao')
            ->orderByDesc('ciclo_id')
            ->limit(3)
            ->get();

        $notasCiclos = $avaliacoes->pluck('nota_final')->filter()->map(fn ($n) => (string) $n)->values()->all();
        $calcService = new \Modules\Capd\Services\NotaCalculoService();
        $nfcProjetada = !empty($notasCiclos) ? $calcService->calcularNfc($notasCiclos) : '0.00';
        $elegivel = (float) $nfcProjetada >= 70.0;

        // RN-08: usa os registros persistidos de capd_quinquenios (idempotentes, via
        // QuinquenioService) em vez de recalcular em memória — evita divergência entre
        // a simulação e os quinquênios efetivamente gerados/consultados alhures.
        $quinquenios = ['qtd_quinquenios' => 0, 'percentual_total' => 0.0, 'proximo_em' => null];
        if ($servidor) {
            $this->quinquenioService->gerarPendentes($servidor);
            $registrados = $this->quinquenioService->listarPorServidor($servidor->id);

            $proximoEm = null;
            if ($servidor->data_admissao) {
                $dataAdmissao = \Carbon\Carbon::parse($servidor->data_admissao);
                $proximoAniversario = $dataAdmissao->copy()->addYears(($registrados->count() + 1) * 5);
                $proximoEm = $proximoAniversario->isFuture() ? $proximoAniversario->toDateString() : null;
            }

            $quinquenios = [
                'qtd_quinquenios'  => $registrados->count(),
                'percentual_total' => (float) $this->quinquenioService->totalPercentual($servidor->id),
                'proximo_em'       => $proximoEm,
            ];
        }

        $percentualProgressao = $elegivel ? 10.0 : 0.0;
        $percentualTotalAumento = $percentualProgressao + $quinquenios['percentual_total'];

        return response()->json([
            'servidor' => [
                'id'            => $servidor?->id ?? $servidorId,
                'nome'          => $servidor?->nome_completo ?? "Servidor #{$servidorId}",
                'matricula'     => $servidor?->matricula ?? "SERV-{$servidorId}",
                'cargo'         => $servidor?->cargo_efetivo ?? 'Geral',
                'data_admissao' => $servidor?->data_admissao,
            ],
            'nfc_projetada'            => $nfcProjetada,
            'elegivel_progressao'      => $elegivel,
            'nota_corte'               => '70.00',
            'historico_ciclos'         => $avaliacoes->map(fn ($a) => [
                'ciclo_id' => $a->ciclo_id,
                'ano'      => $a->ciclo?->ano_referencia,
                'nota'     => $a->nota_final,
            ]),
            'quinquenios'              => $quinquenios,
            'percentual_progressao'    => $percentualProgressao,
            'percentual_total_aumento' => $percentualTotalAumento,
            'regras_legais'            => [
                'lei'                   => 'Lei Municipal nº 1.704/2006 de Araucária',
                'progressao_horizontal' => '+10% sobre o vencimento básico por triênio',
                'quinquenio'            => '+5% por quinquênio de efetivo exercício (Art. 17)',
                'corte_minimo'          => '70,00 pontos para aptidão',
            ],
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

        $this->audit->record('capd', 'avaliacao.homologada', "Avaliacao #{$id} — NFD {$avaliacao->nota_final}", null, ['por' => $request->user()->id, 'avaliacao_id' => $id]);

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

        $servidor = Servidor::where('user_id', $avaliacao->servidor_id)->first();
        $modelo   = $this->perguntaService->getModeloVigente($servidor?->plano_carreira_id);

        if ($modelo === null) {
            return response()->json(['message' => 'Nenhum modelo de formulário vigente configurado para este servidor.'], 422);
        }

        $fatoresPesos = $modelo->fatoresComPesosEfetivos($servidor?->atende_publico ?? true);

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

        $resultado = $calculadoraSemTrava->calcular($respostas, $fatoresPesos, $avaliacao->ciclo_id, $avaliacao->servidor_id);

        return response()->json([
            'preview'   => true,
            'resultado' => $resultado,
            'aviso'     => 'F1 e F2 usam valores placeholder (grau 3). O cálculo definitivo usa dados reais do RH.',
        ]);
    }

}
