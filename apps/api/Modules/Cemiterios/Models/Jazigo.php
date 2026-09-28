<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\EstadoJazigo;

/**
 * Unidade de sepultamento (jazigo, gaveta, ossuário/nicho, cova pública).
 * Estado e ocupação só mudam pelo JazigoEstadoService (RF-04, RNF-06).
 *
 * @property int $capacidade
 * @property int $ocupacao
 * @property int $lock_version
 * @property EstadoJazigo $estado
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $park_id
 * @property int $sector_id
 * @property string $codigo
 * @property string|null $codigo_legado
 * @property string|null $processo_administrativo
 * @property string $tipo
 * @property float|null $comprimento_m
 * @property float|null $largura_m
 * @property float|null $lat
 * @property float|null $lng
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Jazigo extends Model
{
    use TenantAware;
    use SoftDeletes;

    public const TIPOS = ['jazigo', 'gaveta', 'ossuario', 'cova_publica'];

    protected $table = 'plot_inventory';

    protected $guarded = ['id', 'tenant_id', 'ocupacao', 'estado', 'lock_version'];

    protected $casts = [
        'capacidade' => 'integer',
        'ocupacao' => 'integer',
        'lock_version' => 'integer',
        'estado' => EstadoJazigo::class,
        'comprimento_m' => 'float',
        'largura_m' => 'float',
        'lat' => 'float',
        'lng' => 'float',
    ];

    /** @return BelongsTo<Setor, $this> */
    public function setor(): BelongsTo
    {
        return $this->belongsTo(Setor::class, 'sector_id');
    }

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }

    /** @return HasMany<Concessao, $this> */
    public function concessoes(): HasMany
    {
        return $this->hasMany(Concessao::class, 'plot_id')->orderBy('numero')->orderBy('id');
    }

    /** @return HasMany<Inumacao, $this> */
    public function inumacoes(): HasMany
    {
        return $this->hasMany(Inumacao::class, 'plot_id');
    }

    public function concessaoVigente(): ?Concessao
    {
        return $this->concessoes()->where('situacao', 'vigente')->first();
    }

    public function aceitaSepultamento(): bool
    {
        if (in_array($this->estado, [EstadoJazigo::CapacidadeMaxima, EstadoJazigo::Manutencao], true)) {
            return false;
        }

        return $this->estado !== EstadoJazigo::Disponivel || $this->tipo === 'cova_publica';
    }
}
