<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Database\Factories\PessoaVinculoFactory;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string $tipo_vinculo
 * @property string|null $matricula
 * @property array<string, mixed>|null $dados
 * @property \Illuminate\Support\Carbon|null $inicio
 * @property \Illuminate\Support\Carbon|null $fim
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaVinculo extends Model
{
    /** @use HasFactory<PessoaVinculoFactory> */
    use HasFactory;
    use TenantAware;

    protected static function newFactory(): PessoaVinculoFactory
    {
        return PessoaVinculoFactory::new();
    }

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
