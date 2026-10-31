<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Enums\Turno;

/**
 * Rota por escola de destino, ano letivo e turno. A regularidade é calculada na leitura (design D13): a rota já
 * gravada que fica irregular não é alterada, só sinalizada.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $ano_letivo
 * @property int|null $empresa_id
 * @property int|null $veiculo_id
 * @property int|null $motorista_id
 * @property string $nome
 * @property string $turno
 * @property string $tipo_rede
 * @property string $km_pavimentado
 * @property string $km_nao_pavimentado
 * @property string|null $horario_saida
 * @property string|null $horario_chegada
 * @property string|null $horario_retorno
 * @property bool $ativa
 * @property string|null $observacoes
 * @property-read Escola|null $escola
 * @property-read Empresa|null $empresa
 * @property-read Veiculo|null $veiculo
 * @property-read Motorista|null $motorista
 */
final class Rota extends Model
{
    use SoftDeletes;
    use TenantAware;

    protected $table = 'transporte_rotas';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'escola_id', 'ano_letivo', 'empresa_id', 'veiculo_id', 'motorista_id', 'nome', 'turno', 'tipo_rede',
        'km_pavimentado', 'km_nao_pavimentado', 'horario_saida', 'horario_chegada', 'horario_retorno', 'ativa', 'observacoes',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'escola_id' => 'integer',
        'ano_letivo' => 'integer',
        'empresa_id' => 'integer',
        'veiculo_id' => 'integer',
        'motorista_id' => 'integer',
        'km_pavimentado' => 'decimal:2',
        'km_nao_pavimentado' => 'decimal:2',
        'ativa' => 'boolean',
    ];

    /** @return BelongsTo<Escola, $this> */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(Escola::class, 'escola_id');
    }

    /** @return BelongsTo<Empresa, $this> */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /** @return BelongsTo<Veiculo, $this> */
    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id');
    }

    /** @return BelongsTo<Motorista, $this> */
    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class, 'motorista_id');
    }

    /** @return HasMany<RotaParada, $this> */
    public function itinerario(): HasMany
    {
        return $this->hasMany(RotaParada::class, 'rota_id')->orderBy('ordem');
    }

    public function turnoEnum(): Turno
    {
        return Turno::from($this->turno);
    }

    /** Soma das extensões, com 2 casas (calculada, não gravada). */
    public function kmTotal(): float
    {
        return round((float) $this->km_pavimentado + (float) $this->km_nao_pavimentado, 2);
    }

    /**
     * Motivos de irregularidade dos itens da rota: do veículo (`veiculo_inativo`, `sem_vistoria`, `vistoria_vencida`,
     * `contrato_vencido`), da empresa da rota (`empresa_inativa`, `contrato_vencido`) e do motorista
     * (`motorista_inativo` e os de inelegibilidade).
     *
     * @return list<string>
     */
    public function motivosIrregularidade(): array
    {
        $motivos = [];
        if ($this->veiculo !== null) {
            foreach ($this->veiculo->motivosIrregularidade() as $m) {
                $motivos[] = $m === 'inativo' ? 'veiculo_inativo' : $m;
            }
        }
        if ($this->empresa !== null) {
            if (!$this->empresa->ativa) {
                $motivos[] = 'empresa_inativa';
            }
            if ($this->empresa->contratoVencido()) {
                $motivos[] = 'contrato_vencido';
            }
        }
        if ($this->motorista !== null) {
            if (!$this->motorista->ativo) {
                $motivos[] = 'motorista_inativo';
            }
            array_push($motivos, ...$this->motorista->motivosInelegibilidade());
        }

        return array_values(array_unique($motivos));
    }

    public function regular(): bool
    {
        return $this->motivosIrregularidade() === [];
    }
}
