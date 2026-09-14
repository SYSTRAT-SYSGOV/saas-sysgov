<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $etp_id
 * @property int $versao
 * @property string $acao
 * @property array<string, array{de: mixed, para: mixed}>|null $campos_alterados
 * @property array<string, mixed>|null $dados
 * @property int $user_id
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read Etp $etp
 * @property-read User|null $usuario
 */
final class EtpVersao extends Model
{
    public $timestamps = false;

    protected $table = 'licita_etp_versoes';

    protected $fillable = [
        'etp_id',
        'versao',
        'acao',
        'campos_alterados',
        'dados',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'etp_id' => 'integer',
        'versao' => 'integer',
        'campos_alterados' => 'array',
        'dados' => 'array',
        'user_id' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Etp, $this>
     */
    public function etp(): BelongsTo
    {
        return $this->belongsTo(Etp::class, 'etp_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
