<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Database\Factories\PessoaEnderecoFactory;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string|null $cep
 * @property string|null $logradouro
 * @property string|null $numero
 * @property string|null $complemento
 * @property string|null $bairro
 * @property string|null $cidade
 * @property string|null $uf
 * @property string $tipo_endereco
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaEndereco extends Model
{
    /** @use HasFactory<PessoaEnderecoFactory> */
    use HasFactory;
    use TenantAware;

    protected static function newFactory(): PessoaEnderecoFactory
    {
        return PessoaEnderecoFactory::new();
    }

    protected $table = 'pessoas_enderecos';

    protected $guarded = ['id', 'tenant_id'];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }
}
