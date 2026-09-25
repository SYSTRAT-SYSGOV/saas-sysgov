<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Registro do falecido. Causa da morte e documentos médicos são cifrados em
 * repouso e ficam ocultos de toda serialização padrão (RN-06, RNF-09).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $nome_normalizado
 * @property \Illuminate\Support\Carbon|null $nascimento
 * @property \Illuminate\Support\Carbon $falecimento
 * @property int|null $idade_obito
 * @property string|null $certidao_numero
 * @property string|null $certidao_cartorio
 * @property string|null $certidao_arquivo
 * @property string|null $causa_morte
 * @property array<mixed>|null $docs_medicos
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Falecido extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'deceased_records';

    protected $guarded = ['id', 'tenant_id', 'nome_normalizado', 'idade_obito'];

    protected $hidden = ['causa_morte', 'docs_medicos'];

    protected $casts = [
        'nascimento' => 'date',
        'falecimento' => 'date',
        'idade_obito' => 'integer',
        'causa_morte' => 'encrypted',
        'docs_medicos' => 'encrypted:array',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $falecido): void {
            $falecido->nome_normalizado = self::normalizar((string) $falecido->nome);
            if ($falecido->nascimento && $falecido->falecimento) {
                $falecido->idade_obito = (int) $falecido->nascimento->diffInYears($falecido->falecimento);
            } else {
                $falecido->idade_obito = null;
            }
        });
    }

    public static function normalizar(string $texto): string
    {
        return Str::of($texto)->ascii()->lower()->squish()->toString();
    }

    /** @return HasMany<Inumacao, $this> */
    public function inumacoes(): HasMany
    {
        return $this->hasMany(Inumacao::class, 'deceased_id');
    }
}
