<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Conflito entre o dado civil de um registro de módulo e o da pessoa no cadastro central.
 * O cadastro central prevalece até que alguém com permissão decida.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string $modulo
 * @property string $tabela
 * @property int $registro_id
 * @property string $campo
 * @property string|null $valor_modulo
 * @property string|null $valor_mdm
 * @property string $estado
 * @property string|null $decisao
 * @property int|null $resolvida_por
 * @property \Illuminate\Support\Carbon|null $resolvida_em
 */
final class PessoaDivergencia extends Model
{
    use TenantAware;

    public const ABERTA = 'aberta';

    public const RESOLVIDA = 'resolvida';

    /** Qual valor prevaleceu: o do módulo (atualiza a pessoa) ou o do cadastro central. */
    public const DECISOES = ['modulo', 'mdm'];

    protected $table = 'pessoas_divergencias';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'valor_modulo' => 'encrypted',
        'valor_mdm' => 'encrypted',
        'resolvida_em' => 'datetime',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }

    /** @return BelongsTo<User, $this> */
    public function resolvidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolvida_por');
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeAbertas(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('estado', self::ABERTA);
    }
}
