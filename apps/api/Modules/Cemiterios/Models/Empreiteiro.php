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
            $empreiteiro->documento = Documento::somenteDigitos((string) $empreiteiro->documento);
            $empreiteiro->documento_hash = Documento::hash($empreiteiro->documento);
        });
    }

    public function getDocumentoMascaradoAttribute(): string
    {
        try {
            return Documento::mascarar((string) $this->documento);
        } catch (\Throwable) {
            return '—';
        }
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
