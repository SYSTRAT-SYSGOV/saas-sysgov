<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\Evidencia;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Policies\DiarioBordoPolicy;

/**
 * Diário de Bordo Digital — Incidentes Críticos (CIT).
 *
 * Endpoints:
 *   GET    /api/v1/capd/diario-bordo           → lista incidentes do avaliador no ciclo ativo
 *   POST   /api/v1/capd/diario-bordo           → registra novo incidente CIT
 *   GET    /api/v1/capd/diario-bordo/{id}      → detalhe de um incidente
 *   POST   /api/v1/capd/diario-bordo/{id}/evidencias  → upload de evidência documental
 *   DELETE /api/v1/capd/diario-bordo/{id}      → exclusão (somente antes da avaliação)
 */
final class DiarioBordoController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    // ── GET /diario-bordo ─────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        $query = DiarioBordo::with(['fator:id,codigo,nome', 'evidencias'])
            ->where('avaliador_id', $avaliador->id);

        // Filtro opcional por servidor
        if ($servidorId = $request->query('servidor_id')) {
            $query->where('servidor_id', (int) $servidorId);
        }

        // Filtro opcional por ciclo (padrão: ciclo mais recente não encerrado)
        if ($cicloId = $request->query('ciclo_id')) {
            $query->where('ciclo_id', (int) $cicloId);
        } else {
            $cicloAtivo = CicloAvaliacao::where('status', CicloAvaliacao::STATUS_EM_AVALIACAO)
                ->latest()
                ->value('id');
            if ($cicloAtivo) {
                $query->where('ciclo_id', $cicloAtivo);
            }
        }

        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', $tipo);
        }

        $registros = $query->latest('data_ocorrencia')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($registros);
    }

    // ── POST /diario-bordo ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        $validated = $request->validate([
            'ciclo_id'       => ['required', 'integer', 'exists:capd_ciclos,id'],
            'servidor_id'    => ['required', 'integer', 'exists:users,id'],
            'fator_id'       => ['required', 'integer', 'exists:capd_fatores_avaliacao,id'],
            'tipo'           => ['required', 'string', 'in:positivo,negativo'],
            'data_ocorrencia'=> ['required', 'date', 'before_or_equal:today'],
            'descricao_fato' => ['required', 'string', 'min:30', 'max:5000'],
        ]);

        // ── Política: avaliador deve ser superior imediato do servidor ─
        $this->authorize('create', [DiarioBordo::class, $validated['servidor_id']]);

        // ── Garante que o ciclo está em avaliação ─────────────────────
        $ciclo = CicloAvaliacao::findOrFail($validated['ciclo_id']);
        abort_if(
            $ciclo->status !== CicloAvaliacao::STATUS_EM_AVALIACAO,
            422,
            'O ciclo não está em período de avaliação. Não é possível registrar incidentes.'
        );

        // ── Garante que o fator aceita CIT (não automatizado) ─────────
        $fator = FatorAvaliacao::findOrFail($validated['fator_id']);
        abort_if(
            $fator->automatizado,
            422,
            "O fator {$fator->codigo} é calculado automaticamente e não aceita registros CIT manuais."
        );

        $incidente = DiarioBordo::create([
            ...$validated,
            'tenant_id'    => $tenantId,
            'avaliador_id' => $avaliador->id,
        ]);

        $this->audit->record(
            'capd',
            'diario_bordo.created',
            "DiarioBordo #{$incidente->id} — {$fator->codigo} ({$validated['tipo']})",
            null,
            $incidente->toArray(),
        );

        return response()->json($incidente->load(['fator:id,codigo,nome', 'evidencias']), 201);
    }

    // ── GET /diario-bordo/{id} ────────────────────────────────────────

    public function show(int $id): JsonResponse
    {
        $incidente = DiarioBordo::with(['fator', 'evidencias'])->findOrFail($id);
        $this->authorize('view', $incidente);

        return response()->json($incidente);
    }

    // ── POST /diario-bordo/{id}/evidencias ────────────────────────────

    /**
     * Upload de evidência documental para um incidente CIT.
     *
     * Aceita: PDF, PNG, JPG (max 10MB).
     * Calcula e armazena hash SHA-256 do conteúdo do arquivo.
     * Rate limit: 60 uploads/min por IP (configurado nas rotas).
     */
    public function uploadEvidencia(Request $request, int $id): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $incidente = DiarioBordo::findOrFail($id);

        $this->authorize('update', $incidente);

        $request->validate([
            'arquivo' => [
                'required',
                'file',
                'mimes:pdf,png,jpg,jpeg',
                'max:10240', // 10 MB
            ],
        ]);

        $arquivo  = $request->file('arquivo');
        $conteudo = file_get_contents($arquivo->getRealPath());
        $hash     = hash('sha256', $conteudo);

        // Verifica duplicata por hash (evita re-upload do mesmo arquivo)
        $jaExiste = Evidencia::where('diario_bordo_id', $incidente->id)
            ->where('hash_sha256', $hash)
            ->exists();

        if ($jaExiste) {
            return response()->json([
                'message' => 'Este arquivo já foi anexado a este incidente (hash idêntico).',
                'hash'    => $hash,
            ], 422);
        }

        // Armazena em disco criptografado (bucket configurado por tenant)
        $nomeArquivo = "capd/evidencias/t{$tenantId}/{$incidente->id}/{$hash}.{$arquivo->extension()}";
        Storage::disk('evidencias')->put($nomeArquivo, $conteudo);
        $url = Storage::disk('evidencias')->url($nomeArquivo);

        $evidencia = Evidencia::create([
            'tenant_id'         => $tenantId,
            'diario_bordo_id'   => $incidente->id,
            'nome_arquivo'      => $arquivo->getClientOriginalName(),
            'url_armazenamento' => $url,
            'hash_sha256'       => $hash,
            'mime_type'         => $arquivo->getMimeType(),
            'tamanho_bytes'     => $arquivo->getSize(),
        ]);

        $this->audit->record(
            'capd',
            'evidencia.uploaded',
            "Evidência #{$evidencia->id} → DiarioBordo #{$incidente->id}",
            null,
            ['hash' => $hash, 'nome' => $arquivo->getClientOriginalName(), 'bytes' => $arquivo->getSize()],
        );

        return response()->json([
            'evidencia' => $evidencia,
            'hash_sha256' => $hash,
            'message' => 'Evidência anexada com sucesso. Hash SHA-256 registrado.',
        ], 201);
    }

    // ── DELETE /diario-bordo/{id} ─────────────────────────────────────

    public function destroy(int $id): JsonResponse
    {
        $incidente = DiarioBordo::with('evidencias')->findOrFail($id);
        $this->authorize('delete', $incidente);

        // Não permite exclusão se a avaliação já foi finalizada/homologada
        $avaliacaoFinalizada = \DB::table('capd_avaliacoes')
            ->where('ciclo_id', $incidente->ciclo_id)
            ->where('servidor_id', $incidente->servidor_id)
            ->where('homologada', true)
            ->exists();

        abort_if(
            $avaliacaoFinalizada,
            422,
            'Não é possível excluir incidentes de uma avaliação já homologada.'
        );

        $before = $incidente->toArray();
        $incidente->delete();

        $this->audit->record('capd', 'diario_bordo.deleted', "DiarioBordo #{$id}", $before, null);

        return response()->json(['deleted' => true, 'id' => $id]);
    }
}
