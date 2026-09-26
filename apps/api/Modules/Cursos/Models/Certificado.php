<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Cursos\Enums\TipoCertificado;

/**
 * Certificado emitido. `dados` é o snapshot congelado na emissão (design D8):
 * alterações posteriores no curso ou no participante não mudam o certificado.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $codigo
 * @property string $tipo
 * @property int $participante_id
 * @property int|null $inscricao_id
 * @property int|null $formacao_id
 * @property int|null $modelo_id
 * @property array<string, mixed> $dados
 * @property \Illuminate\Support\Carbon $emitido_em
 * @property \Illuminate\Support\Carbon|null $revogado_em
 * @property int|null $revogado_por
 * @property string|null $motivo_revogacao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Participante $participante
 * @property-read Inscricao|null $inscricao
 * @property-read Formacao|null $formacao
 */
final class Certificado extends Model
{
    use TenantAware;

    protected $table = 'cursos_certificados';

    protected $fillable = [
        'tenant_id', 'codigo', 'tipo', 'participante_id', 'inscricao_id', 'formacao_id', 'modelo_id',
        'dados', 'emitido_em', 'revogado_em', 'revogado_por', 'motivo_revogacao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'participante_id' => 'integer',
        'inscricao_id' => 'integer',
        'formacao_id' => 'integer',
        'modelo_id' => 'integer',
        'dados' => 'array',
        'emitido_em' => 'datetime',
        'revogado_em' => 'datetime',
        'revogado_por' => 'integer',
    ];

    public function tipoEnum(): TipoCertificado
    {
        return TipoCertificado::from($this->tipo);
    }

    public function revogado(): bool
    {
        return $this->revogado_em !== null;
    }

    /** Código no formato de exibição XXXX-XXXX-XXXX. */
    public function codigoFormatado(): string
    {
        return implode('-', str_split($this->codigo, 4));
    }

    /** @return BelongsTo<Participante, $this> */
    public function participante(): BelongsTo
    {
        return $this->belongsTo(Participante::class, 'participante_id');
    }

    /** @return BelongsTo<Inscricao, $this> */
    public function inscricao(): BelongsTo
    {
        return $this->belongsTo(Inscricao::class, 'inscricao_id');
    }

    /** @return BelongsTo<Formacao, $this> */
    public function formacao(): BelongsTo
    {
        return $this->belongsTo(Formacao::class, 'formacao_id');
    }
}
