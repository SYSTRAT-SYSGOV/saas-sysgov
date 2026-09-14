<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Models\User;
use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\Evidencia;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\Servidor;
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
            ->where('tenant_id', $tenantId);

        // Filtro por servidor avaliado
        if ($request->filled('servidor_id')) {
            $query->where('servidor_id', $request->input('servidor_id'));
        }

        // Filtro por ciclo
        if ($request->filled('ciclo_id')) {
            $query->where('ciclo_id', $request->input('ciclo_id'));
        }

        // Filtro por tipo (positivo/negativo)
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Servidor comum só enxerga seus próprios registros
        $temPapelPrivilegiado = $avaliador && collect(['admin_tenant', 'gestor_rh', 'avaliador_capd', 'membro_comissao'])
            ->contains(fn (string $papel) => $avaliador->hasRole($papel));

        if ($avaliador && ! $temPapelPrivilegiado) {
            $query->where('servidor_id', $avaliador->id);
        }

        $incidentes = $query->latest('data_ocorrencia')->paginate(20);

        return response()->json($incidentes);
    }

    // ── POST /diario-bordo ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $tenantId  = (int) app(TenantContext::class)->id();
        $avaliador = $request->user();

        // ── 1. Resolução flexível de servidor_id (suporta capd_servidores.id e users.id)
        $inputServidorId = (int) $request->input('servidor_id');
        $servidorRecord = Servidor::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($inputServidorId) {
                $q->where('id', $inputServidorId)
                  ->orWhere('user_id', $inputServidorId);
            })->first();

        $resolvedUserId = $servidorRecord?->user_id ?? $inputServidorId;

        if ($servidorRecord && ! $servidorRecord->user_id) {
            $user = User::firstOrCreate(
                ['email' => $servidorRecord->email ?: "servidor.{$servidorRecord->matricula}@{$tenantId}.gov.br"],
                ['name' => $servidorRecord->nome_completo, 'password' => Hash::make('sysgov@2026')]
            );
            $user->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);
            $servidorRecord->update(['user_id' => $user->id]);
            $resolvedUserId = (int) $user->id;
        }

        // ── 2. Resolução de ciclo_id ativo caso omitido ou homologado
        $inputCicloId = (int) $request->input('ciclo_id');
        $ciclo = CicloAvaliacao::where('tenant_id', $tenantId)->find($inputCicloId);

        if (! $ciclo || in_array($ciclo->status, [CicloAvaliacao::STATUS_HOMOLOGADO, CicloAvaliacao::STATUS_ENCERRADO], true)) {
            $cicloAtivo = CicloAvaliacao::where('tenant_id', $tenantId)
                ->whereIn('status', [CicloAvaliacao::STATUS_EM_AVALIACAO, CicloAvaliacao::STATUS_ABERTO, CicloAvaliacao::STATUS_PLANEJAMENTO, CicloAvaliacao::STATUS_PLANEJADO])
                ->latest('id')
                ->first();

            if ($cicloAtivo) {
                $ciclo = $cicloAtivo;
            }
        }

        if (! $ciclo) {
            $ciclo = CicloAvaliacao::where('tenant_id', $tenantId)->latest('id')->first();
        }

        // Merge dos valores resolvidos para validação consistente
        if ($ciclo) {
            $request->merge(['ciclo_id' => $ciclo->id]);
        }
        $request->merge(['servidor_id' => $resolvedUserId]);

        $validated = $request->validate([
            'ciclo_id'       => ['required', 'integer', 'exists:capd_ciclos,id'],
            'servidor_id'    => ['required', 'integer', 'exists:users,id'],
            'fator_id'       => ['required', 'integer', 'exists:capd_fatores_avaliacao,id'],
            'tipo'           => ['required', 'string', 'in:positivo,negativo'],
            'data_ocorrencia'=> ['required', 'date', 'before_or_equal:today'],
            'descricao_fato' => ['required', 'string', 'min:30', 'max:5000'],
        ], [
            'descricao_fato.min' => 'A descrição circunstanciada do fato deve conter no mínimo 30 caracteres para fundamentar a avaliação.',
            'data_ocorrencia.before_or_equal' => 'A data da ocorrência não pode ser superior à data de hoje.',
            'servidor_id.exists' => 'O servidor selecionado não possui conta de usuário válida no sistema.',
        ]);

        // ── Política: avaliador deve ter permissão ou ser superior imediato
        abort_unless(
            $avaliador && $avaliador->can('create', [DiarioBordo::class, $validated['servidor_id']]),
            403,
            'Você não possui permissão para registrar incidentes no Diário de Bordo para este servidor.'
        );

        // ── Garante que o ciclo não está arquivado ou encerrado
        abort_if(
            in_array($ciclo->status, [CicloAvaliacao::STATUS_HOMOLOGADO, CicloAvaliacao::STATUS_ENCERRADO], true),
            422,
            'O ciclo de avaliação selecionado já foi homologado ou encerrado. Não é possível registrar novos incidentes.'
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
