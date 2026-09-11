<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Support\HtmlSanitizer;

final class LegalDocumentoService
{
    /** Tamanho máximo (em caracteres de texto puro) de cada documento ao montar o contexto — controla o tamanho do futuro prompt de IA (Fase 1.5). */
    private const LIMITE_CARACTERES_POR_DOCUMENTO = 4000;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @return Collection<int, LegalDocumento>
     */
    public function listar(?string $tipo = null, ?string $search = null): Collection
    {
        return LegalDocumento::query()
            ->when($tipo !== null && $tipo !== '', fn ($q) => $q->where('tipo', $tipo))
            ->when($search !== null && $search !== '', fn ($q) => $q->where('titulo', 'like', "%{$search}%"))
            ->where('ativo', true)
            ->orderByRaw('tenant_id IS NOT NULL') // globais primeiro
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param array<string, mixed> $data
     */
    public function criar(array $data, User $user, bool $global): LegalDocumento
    {
        if ($global && !$user->is_platform_admin) {
            throw new DomainException('Apenas administradores da plataforma podem cadastrar documentos legais globais.');
        }

        $documento = LegalDocumento::create([
            ...$data,
            'texto_completo' => $this->sanitizer->sanitize($data['texto_completo']),
            'tenant_id' => $global ? null : $this->tenantContext->id(),
            'criado_por' => $user->id,
        ]);

        $this->audit->record('licita', 'legal_documento.criado', "LegalDocumento #{$documento->id}", null, $documento->toArray());
        $this->outbox->publish('licita.LegalDocumentoCriado', ['id' => $documento->id, 'global' => $global]);

        return $documento;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(LegalDocumento $documento, array $data): LegalDocumento
    {
        $antes = $documento->toArray();

        if (array_key_exists('texto_completo', $data)) {
            $data['texto_completo'] = $this->sanitizer->sanitize($data['texto_completo']);
        }

        $documento->update($data);

        $this->audit->record('licita', 'legal_documento.atualizado', "LegalDocumento #{$documento->id}", $antes, $documento->toArray());

        return $documento->refresh();
    }

    public function excluir(LegalDocumento $documento): void
    {
        $documento->delete();
        $this->audit->record('licita', 'legal_documento.excluido', "LegalDocumento #{$documento->id}", $documento->toArray(), null);
    }

    /**
     * Concatena os documentos globais + os do tenant em um único texto de
     * contexto, truncado por documento — usado como entrada do prompt da
     * IA na Fase 1.5. Ainda não é chamado por nenhum fluxo desta entrega.
     *
     * @param array<int, string> $tags
     */
    public function buildContexto(int $tenantId, array $tags = []): string
    {
        $documentos = LegalDocumento::query()
            ->where('ativo', true)
            ->where(fn ($q) => $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId))
            ->when($tags !== [], fn ($q) => $q->where(function ($q2) use ($tags): void {
                foreach ($tags as $tag) {
                    $q2->orWhereJsonContains('tags', $tag);
                }
            }))
            ->get();

        $partes = [];
        foreach ($documentos as $documento) {
            $texto = strip_tags($documento->texto_completo);
            $texto = mb_substr($texto, 0, self::LIMITE_CARACTERES_POR_DOCUMENTO);
            $partes[] = sprintf(
                "[%s] %s%s\n%s",
                $documento->isGlobal() ? 'GLOBAL' : 'LOCAL',
                $documento->titulo,
                $documento->numero !== null ? " ({$documento->numero})" : '',
                $texto
            );
        }

        return implode("\n\n---\n\n", $partes);
    }
}
