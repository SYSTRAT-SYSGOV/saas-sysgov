<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tr_id
 * @property int $versao
 * @property string $acao
 * @property array<string, array{de: mixed, para: mixed}>|null $campos_alterados
 * @property array<string, mixed>|null $dados
 * @property int $user_id
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read Tr $tr
 * @property-read User|null $usuario
 */
final class TrVersao extends Model
{
    public $timestamps = false;

    protected $table = 'licita_tr_versoes';

    protected $fillable = [
        'tr_id',
        'versao',
        'acao',
        'campos_alterados',
        'dados',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'tr_id' => 'integer',
        'versao' => 'integer',
        'campos_alterados' => 'array',
        'dados' => 'array',
        'user_id' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Tr, $this>
     */
    public function tr(): BelongsTo
    {
        return $this->belongsTo(Tr::class, 'tr_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
