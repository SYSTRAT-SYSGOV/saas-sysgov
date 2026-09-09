<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Documento legal (lei, decreto, instrução normativa, jurisprudência) usado
 * como contexto para o usuário — e, futuramente, para a IA (Fase 1.5) — na
 * elaboração dos artefatos do Licita.
 *
 * `tenant_id === null` identifica um documento GLOBAL, mantido pela
 * SYSTRAT e visível a todos os tenants (ex.: a própria Lei 14.133/2021).
 * Por isso este model NÃO usa o trait TenantAware (que exige tenant_id
 * não-nulo ao criar) — o escopo é implementado manualmente no boot().
 *
 * @property int $id
 * @property int|null $tenant_id
 * @property string $tipo
 * @property string|null $numero
 * @property string $titulo
 * @property string|null $ementa
 * @property string $texto_completo
 * @property array<int, string>|null $tags
 * @property bool $ativo
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read User|null $criador
 */
final class LegalDocumento extends Model
{
    use SoftDeletes;

    protected $table = 'licita_legal_documentos';

    protected $fillable = [
        'tenant_id',
        'tipo',
        'numero',
        'titulo',
        'ementa',
        'texto_completo',
        'tags',
        'ativo',
        'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'tags' => 'array',
        'ativo' => 'boolean',
        'criado_por' => 'integer',
    ];

    protected static function booted(): void
    {
        // Escopo próprio (não TenantAware): um usuário autenticado deve ver
        // os documentos GLOBAIS (tenant_id null) + os do PRÓPRIO tenant.
        static::addGlobalScope('licita-legal-visibilidade', function (Builder $query): void {
            $context = app(TenantContext::class);
            if ($context->hasTenant()) {
                $query->where(function (Builder $q) use ($context): void {
                    $q->whereNull($q->getModel()->qualifyColumn('tenant_id'))
                        ->orWhere($q->getModel()->qualifyColumn('tenant_id'), $context->id());
                });
            }
        });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    public function isGlobal(): bool
    {
        return $this->tenant_id === null;
    }
}
