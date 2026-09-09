<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DfdVersao extends Model
{
    public $timestamps = false;

    protected $table = 'licita_dfd_versoes';

    protected $fillable = [
        'dfd_id',
        'versao',
        'acao',
        'campos_alterados',
        'dados',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'dfd_id' => 'integer',
        'versao' => 'integer',
        'campos_alterados' => 'array',
        'dados' => 'array',
        'user_id' => 'integer',
        'created_at' => 'datetime',
    ];

    public function dfd(): BelongsTo
    {
        return $this->belongsTo(Dfd::class, 'dfd_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
