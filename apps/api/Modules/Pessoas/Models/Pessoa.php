<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Database\Factories\PessoaFactory;
use Modules\Pessoas\Events\PessoaAtualizada;
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
 * @property bool $falecido
 * @property \Illuminate\Support\Carbon|null $data_falecimento
 * @property string|null $certidao_obito_numero
 * @property string|null $cartorio_obito
 * @property string|null $observacao_obito
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $cpf_mascarado
 */
final class Pessoa extends Model
{
    /** @use HasFactory<PessoaFactory> */
    use HasFactory;
    use TenantAware;
    use SoftDeletes;

    protected static function newFactory(): PessoaFactory
    {
        return PessoaFactory::new();
    }

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
        'falecido' => 'boolean',
        'data_falecimento' => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $pessoa): void {
            $pessoa->cpf = Documento::somenteDigitos((string) $pessoa->cpf);
            $pessoa->cpf_hash = Documento::hash($pessoa->cpf);
            if ($pessoa->falecido && $pessoa->status === 'ativo') {
                $pessoa->status = 'falecido';
            }
        });

        // Consumidores (Escola, Cursos…) mantêm cópias de exibição: avisa quando dado civil muda.
        static::updated(function (self $pessoa): void {
            $alterados = array_values(array_filter(PessoaAtualizada::CAMPOS, fn (string $c): bool => $pessoa->wasChanged($c)));
            if ($alterados !== []) {
                PessoaAtualizada::dispatch($pessoa->id, (int) $pessoa->tenant_id, $alterados);
            }
        });
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeFalecidos(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('falecido', true);
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeVivos(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('falecido', false);
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
