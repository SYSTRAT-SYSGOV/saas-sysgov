<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string $tipo
 * @property string $valor
 * @property bool $principal
 * @property bool $autoriza_notificacoes
 */
final class PessoaContato extends Model
{
    use TenantAware;

    public const TIPOS = ['celular', 'email', 'telefone'];

    protected $table = 'pessoas_contatos';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'principal' => 'boolean',
        'autoriza_notificacoes' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saved(function (self $contato): void {
            if ($contato->principal) {
                self::where('pessoa_id', $contato->pessoa_id)
                    ->where('tipo', $contato->tipo)
                    ->whereKeyNot($contato->id)
                    ->update(['principal' => false]);
            }
        });
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }
}
