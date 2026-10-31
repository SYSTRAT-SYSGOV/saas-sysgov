<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;
use Modules\Transporte\Enums\TipoEmpresa;

/**
 * Empresa de transporte: sempre uma pessoa jurídica do Cadastro de Pessoas (D4), prestadora ou locadora, com contrato.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string $tipo
 * @property string $contrato_numero
 * @property \Illuminate\Support\Carbon $vigencia_inicio
 * @property \Illuminate\Support\Carbon $vigencia_fim
 * @property bool $ativa
 * @property string|null $observacoes
 * @property-read Pessoa|null $pessoa
 */
final class Empresa extends Model
{
    use SoftDeletes;
    use TenantAware;

    protected $table = 'transporte_empresas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'pessoa_id', 'tipo', 'contrato_numero', 'vigencia_inicio', 'vigencia_fim', 'ativa', 'observacoes'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'vigencia_inicio' => 'date',
        'vigencia_fim' => 'date',
        'ativa' => 'boolean',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<Veiculo, $this> */
    public function veiculos(): HasMany
    {
        return $this->hasMany(Veiculo::class, 'empresa_id');
    }

    public function tipoEnum(): TipoEmpresa
    {
        return TipoEmpresa::from($this->tipo);
    }

    public function nome(): string
    {
        $pessoa = $this->pessoa;

        return (string) ($pessoa?->razao_social ?: $pessoa?->nome ?: "Empresa #{$this->id}");
    }

    public function contratoVencido(): bool
    {
        return $this->vigencia_fim->lt(today());
    }
}
