<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\NotificacaoEnvio;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Models\Curso;

/**
 * E-mails enviados pelo consumidor do Outbox, do ponto de vista do órgão (tarefa 1.8, design
 * D2). `NotificacaoEnvio` não é `TenantAware` (tenant_id nulo-permitido, mesmo padrão de
 * OutboxEvent), então o isolamento por tenant é explícito aqui — inclusive no reenvio, onde o
 * model binding implícito não filtra por conta própria.
 */
final class EnvioController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $filtros = $request->validate([
            'situacao' => ['sometimes', 'nullable', Rule::in(['pendente', 'enviado', 'falhou', 'ignorado'])],
            'por_pagina' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'pagina' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $envios = NotificacaoEnvio::query()
            ->where('tenant_id', $this->tenantContext->id())
            ->when($filtros['situacao'] ?? null, fn ($q, $situacao) => $q->where('situacao', $situacao))
            ->orderByDesc('id')
            ->paginate(min(100, max(1, $filtros['por_pagina'] ?? 25)), page: max(1, $filtros['pagina'] ?? 1));

        $envios->through(fn (NotificacaoEnvio $e): array => [
            'id' => $e->id,
            'tipo' => $e->tipo,
            'destinatario' => $e->destinatario,
            'situacao' => $e->situacao,
            'tentativas' => $e->tentativas,
            'erro' => $e->erro,
            'enviado_em' => $e->enviado_em,
            'criado_em' => $e->created_at,
        ]);

        return response()->json($envios);
    }

    public function reenviar(NotificacaoEnvio $envio): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        if ($envio->tenant_id !== $this->tenantContext->id()) {
            abort(404);
        }
        if ($envio->situacao !== 'falhou') {
            return response()->json(['error' => 'Só é possível reenviar envios com falha.'], 422);
        }

        $envio->update(['situacao' => 'pendente']);
        $envio->evento()->update(['status' => 'pending', 'available_at' => now()]);

        $this->audit->record('cursos', 'notificacao.reenviada', "Envio #{$envio->id}", null, ['tipo' => $envio->tipo, 'destinatario' => $envio->destinatario]);

        return response()->json([
            'id' => $envio->id,
            'tipo' => $envio->tipo,
            'destinatario' => $envio->destinatario,
            'situacao' => $envio->fresh()->situacao,
        ]);
    }
}
