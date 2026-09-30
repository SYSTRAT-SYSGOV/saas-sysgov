<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\Documento;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $pessoa_id
 * @property string $tipo_doc
 * @property string $documento
 * @property string $documento_hash
 * @property string $nome
 * @property string|null $responsavel_tecnico
 * @property string|null $contatos
 * @property string $situacao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $documento_mascarado
 * @property-read \Modules\Pessoas\Models\Pessoa|null $pessoa
 */
final class Empreiteiro extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_contractors';

    protected $guarded = ['id', 'tenant_id', 'documento_hash', 'situacao'];

    protected $hidden = ['documento', 'documento_hash'];

    protected $casts = ['documento' => 'encrypted', 'contatos' => 'encrypted'];

    protected $appends = ['documento_mascarado'];

    protected static function booted(): void
    {
        static::saving(function (self $empreiteiro): void {
            if ($empreiteiro->pessoa_id && $empreiteiro->pessoa) {
                $empreiteiro->documento = (string) $empreiteiro->pessoa->cpf;
                $empreiteiro->documento_hash = (string) $empreiteiro->pessoa->cpf_hash;
                return;
            }
            $empreiteiro->documento = Documento::somenteDigitos((string) $empreiteiro->documento);
            $empreiteiro->documento_hash = Documento::hash($empreiteiro->documento);
        });
    }

    public function getDocumentoMascaradoAttribute(): string
    {
        if ($this->pessoa_id && $this->pessoa) {
            return $this->pessoa->cpf_mascarado;
        }
        try {
            return Documento::mascarar((string) $this->documento);
        } catch (\Throwable) {
            return '—';
        }
    }

    /** @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\Modules\Pessoas\Models\Pessoa, $this> */
    public function pessoa(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\Modules\Pessoas\Models\Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<AlvaraAnual, $this> */
    public function alvaras(): HasMany
    {
        return $this->hasMany(AlvaraAnual::class, 'contractor_id');
    }

    /** @return HasMany<AlvaraObra, $this> */
    public function obras(): HasMany
    {
        return $this->hasMany(AlvaraObra::class, 'contractor_id');
    }

    /** @return HasMany<Penalidade, $this> */
    public function penalidades(): HasMany
    {
        return $this->hasMany(Penalidade::class, 'contractor_id');
    }
}
