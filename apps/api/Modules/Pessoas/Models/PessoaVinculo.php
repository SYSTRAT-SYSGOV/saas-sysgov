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
 * @property string $tipo_vinculo
 * @property string|null $matricula
 * @property array<string, mixed>|null $dados
 * @property \Illuminate\Support\Carbon|null $inicio
 * @property \Illuminate\Support\Carbon|null $fim
 */
final class PessoaVinculo extends Model
{
    use TenantAware;

    public const TIPOS = [
        'servidor_carreira', 'estagiario', 'comissionado', 'clt',
        'municipe', 'contribuinte', 'aluno', 'paciente',
    ];

    protected $table = 'pessoas_vinculos';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'dados' => 'array',
        'inicio' => 'date',
        'fim' => 'date',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }
}
