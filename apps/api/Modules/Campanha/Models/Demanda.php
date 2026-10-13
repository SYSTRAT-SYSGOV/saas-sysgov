<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Demanda da campanha num município (D7). Atrasada = prazo vencido e status diferente de concluída.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int $codigo_ibge
 * @property string $solicitante
 * @property int|null $eleitor_id
 * @property string $categoria
 * @property string $prioridade
 * @property int|null $responsavel_id
 * @property Carbon|null $prazo
 * @property string $status
 * @property string $descricao
 * @property list<array{em: string, por: string|null, texto: string}>|null $historico
 */
final class Demanda extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    public const CATEGORIAS = ['saude', 'infraestrutura', 'seguranca', 'educacao', 'emenda_parlamentar', 'oficio', 'outra'];

    public const PRIORIDADES = ['alta', 'media', 'baixa'];

    public const STATUS = ['pendente', 'em_andamento', 'concluida'];

    protected $table = 'campanha_demandas';

    protected $fillable = ['tenant_id', 'campanha_id', 'codigo_ibge', 'solicitante', 'eleitor_id', 'categoria', 'prioridade', 'responsavel_id', 'prazo', 'status', 'descricao', 'historico'];

    protected $attributes = ['status' => 'pendente', 'prioridade' => 'media'];

    protected $appends = ['atrasada'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'codigo_ibge' => 'integer',
        'eleitor_id' => 'integer',
        'responsavel_id' => 'integer',
        'prazo' => 'date:Y-m-d',
        'historico' => 'array',
    ];

    /** @return BelongsTo<User, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_id');
    }

    public function getAtrasadaAttribute(): bool
    {
        return $this->prazo !== null && $this->status !== 'concluida' && $this->prazo->lt(today());
    }
}
