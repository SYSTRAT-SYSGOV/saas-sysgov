<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Fornecedor de serviços da frota (mecânica, combustível, seguro...): sempre uma pessoa jurídica do Cadastro de
 * Pessoas (design D-M1). Não é a empresa de transporte; a mesma pessoa pode ser as duas.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property list<string> $ramos
 * @property string|null $contato
 * @property bool $ativo
 * @property string|null $observacoes
 * @property-read Pessoa|null $pessoa
 */
final class Fornecedor extends Model
{
    use SoftDeletes;
    use TenantAware;

    protected $table = 'transporte_fornecedores';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'pessoa_id', 'ramos', 'contato', 'ativo', 'observacoes'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'pessoa_id' => 'integer', 'ramos' => 'array', 'ativo' => 'boolean'];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<OrdemServico, $this> */
    public function ordens(): HasMany
    {
        return $this->hasMany(OrdemServico::class, 'fornecedor_id');
    }

    public function nome(): string
    {
        $pessoa = $this->pessoa;

        return (string) ($pessoa?->razao_social ?: $pessoa?->nome ?: "Fornecedor #{$this->id}");
    }
}
