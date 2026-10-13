<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Foto do bem em disco privado (D12).
 *
 * @property int $id
 * @property int $bem_id
 * @property string $caminho
 * @property string $mime
 * @property bool $principal
 */
final class BemFoto extends Model
{
    use TenantAware;

    protected $table = 'inservivel_bem_fotos';

    protected $fillable = ['tenant_id', 'bem_id', 'caminho', 'mime', 'principal'];

    protected $hidden = ['caminho'];

    protected $casts = ['tenant_id' => 'integer', 'bem_id' => 'integer', 'principal' => 'boolean'];

    /** @return BelongsTo<Bem, $this> */
    public function bem(): BelongsTo
    {
        return $this->belongsTo(Bem::class, 'bem_id');
    }
}
