<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Support\Documento;

/**
 * Cadastro único de pessoa física por tenant (identidade civil).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $cpf
 * @property string $cpf_hash
 * @property string $nome
 * @property string|null $nome_social
 * @property \Illuminate\Support\Carbon|null $data_nascimento
 * @property string|null $sexo
 * @property string|null $nome_mae
 * @property string|null $nome_pai
 * @property string|null $estado_civil
 * @property string|null $nacionalidade
 * @property string|null $naturalidade
 * @property string|null $nis
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Pessoa extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'pessoas';

    protected $guarded = ['id', 'tenant_id', 'cpf_hash'];

    protected $hidden = ['cpf', 'cpf_hash'];

    protected $appends = ['cpf_mascarado'];

    protected $casts = [
        'cpf' => 'encrypted',
        'nome_mae' => 'encrypted',
        'nome_pai' => 'encrypted',
        'nis' => 'encrypted',
        'data_nascimento' => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $pessoa): void {
            $pessoa->cpf = Documento::somenteDigitos((string) $pessoa->cpf);
            $pessoa->cpf_hash = Documento::hash($pessoa->cpf);
        });
    }

    public function getCpfMascaradoAttribute(): string
    {
        try {
            return Documento::mascarar((string) $this->cpf);
        } catch (\Throwable) {
            return '—';
        }
    }

    /** @return HasMany<PessoaVinculo, $this> */
    public function vinculos(): HasMany
    {
        return $this->hasMany(PessoaVinculo::class);
    }

    /** @return HasMany<PessoaDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(PessoaDocumento::class);
    }

    /** @return HasMany<PessoaEndereco, $this> */
    public function enderecos(): HasMany
    {
        return $this->hasMany(PessoaEndereco::class);
    }

    /** @return HasMany<PessoaContato, $this> */
    public function contatos(): HasMany
    {
        return $this->hasMany(PessoaContato::class);
    }

    /** @return HasOne<PessoaUsuario, $this> */
    public function usuario(): HasOne
    {
        return $this->hasOne(PessoaUsuario::class);
    }
}
