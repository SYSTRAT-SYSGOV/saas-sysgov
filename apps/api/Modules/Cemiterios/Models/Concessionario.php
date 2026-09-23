<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Modules\Cemiterios\Support\Documento;

/**
 * Titular de concessão (RN-05: proteção integral LGPD). Autentica-se no portal
 * pelo Gov.br e recebe token Sanctum próprio (guard do portal).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $tipo_doc
 * @property string $documento
 * @property string $documento_hash
 * @property string|null $email
 * @property string|null $telefone
 * @property string|null $endereco
 * @property string $base_legal
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Concessionario extends Model
{
    use TenantAware;
    use SoftDeletes;
    use HasApiTokens;

    protected $table = 'concession_holders';

    protected $guarded = ['id', 'tenant_id', 'documento_hash'];

    protected $hidden = ['documento', 'documento_hash'];

    protected $appends = ['documento_mascarado'];

    protected $casts = [
        'documento' => 'encrypted',
        'email' => 'encrypted',
        'telefone' => 'encrypted',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $holder): void {
            $holder->documento = Documento::somenteDigitos((string) $holder->documento);
            $holder->documento_hash = Documento::hash($holder->documento);
        });
    }

    /** CPF/CNPJ sempre mascarado nas listagens (RN-05). */
    public function getDocumentoMascaradoAttribute(): string
    {
        return Documento::mascarar((string) $this->documento);
    }

    /** @return HasMany<Concessao, $this> */
    public function concessoes(): HasMany
    {
        return $this->hasMany(Concessao::class, 'holder_id');
    }
}
