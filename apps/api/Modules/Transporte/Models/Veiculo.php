<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Transporte\Enums\OrigemVeiculo;

/**
 * Veículo da frota permanente (próprio, locado ou terceirizado). Não confundir com `passeio_veiculos` (D5).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $origem
 * @property int|null $empresa_id
 * @property int|null $motorista_padrao_id
 * @property string $descricao
 * @property string $placa
 * @property string|null $renavam
 * @property string|null $chassi
 * @property string|null $marca_modelo
 * @property int|null $ano_fabricacao
 * @property int|null $ano_modelo
 * @property \Illuminate\Support\Carbon|null $data_licenca
 * @property int $capacidade
 * @property string $tipo_rede
 * @property int $tipologia_inep
 * @property bool $uso_exclusivo
 * @property bool $acessivel
 * @property bool $ativo
 * @property string|null $motivo_inativacao
 * @property string|null $observacoes
 * @property string|null $vistorias_max_validade preenchido por withMax('vistorias', 'validade')
 * @property-read Empresa|null $empresa
 * @property-read Motorista|null $motoristaPadrao
 */
final class Veiculo extends Model
{
    use SoftDeletes;
    use TenantAware;

    protected $table = 'transporte_veiculos';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'origem', 'empresa_id', 'motorista_padrao_id', 'descricao', 'placa', 'renavam', 'chassi', 'marca_modelo',
        'ano_fabricacao', 'ano_modelo', 'data_licenca', 'capacidade', 'tipo_rede', 'tipologia_inep', 'uso_exclusivo',
        'acessivel', 'ativo', 'motivo_inativacao', 'observacoes',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'empresa_id' => 'integer',
        'motorista_padrao_id' => 'integer',
        'ano_fabricacao' => 'integer',
        'ano_modelo' => 'integer',
        'data_licenca' => 'date',
        'capacidade' => 'integer',
        'tipologia_inep' => 'integer',
        'uso_exclusivo' => 'boolean',
        'acessivel' => 'boolean',
        'ativo' => 'boolean',
    ];

    /** @return BelongsTo<Empresa, $this> */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /** @return BelongsTo<Motorista, $this> */
    public function motoristaPadrao(): BelongsTo
    {
        return $this->belongsTo(Motorista::class, 'motorista_padrao_id');
    }

    /** @return HasMany<Vistoria, $this> */
    public function vistorias(): HasMany
    {
        return $this->hasMany(Vistoria::class, 'veiculo_id');
    }

    public function origemEnum(): OrigemVeiculo
    {
        return OrigemVeiculo::from($this->origem);
    }

    /** Validade da vistoria de maior validade (D: a regularidade vem do histórico, não de coluna copiada). */
    public function validadeDaVistoria(): ?\Illuminate\Support\Carbon
    {
        $valor = array_key_exists('vistorias_max_validade', $this->attributes)
            ? $this->attributes['vistorias_max_validade']
            : $this->vistorias()->max('validade');

        return $valor === null ? null : \Illuminate\Support\Carbon::parse((string) $valor)->startOfDay();
    }

    /**
     * Motivos de irregularidade: `inativo`, `sem_vistoria`, `vistoria_vencida` e `contrato_vencido` (empresa do
     * veículo locado ou terceirizado). Veículo próprio não depende de contrato.
     *
     * @return list<string>
     */
    public function motivosIrregularidade(): array
    {
        $motivos = [];
        if (!$this->ativo) {
            $motivos[] = 'inativo';
        }
        $validade = $this->validadeDaVistoria();
        if ($validade === null) {
            $motivos[] = 'sem_vistoria';
        } elseif ($validade->lt(today())) {
            $motivos[] = 'vistoria_vencida';
        }
        if ($this->origemEnum() !== OrigemVeiculo::Propria && $this->empresa?->contratoVencido()) {
            $motivos[] = 'contrato_vencido';
        }

        return $motivos;
    }

    public function regular(): bool
    {
        return $this->motivosIrregularidade() === [];
    }
}
