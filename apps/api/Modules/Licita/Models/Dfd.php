<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Licita\Enums\StatusDfd;

final class Dfd extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'licita_dfds';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'data_previsao',
        'grau_prioridade',
        'justificativa',
        'objeto',
        'previsao_pca',
        'numero_pca',
        'area_requisitante',
        'equipe_planejamento',
        'status',
        'gerado_por_ia',
        'elaborado_por',
        'aprovado_por',
        'aprovado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'data_previsao' => 'date',
        'previsao_pca' => 'boolean',
        'equipe_planejamento' => 'array',
        'gerado_por_ia' => 'boolean',
        'elaborado_por' => 'integer',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
    ];

    public function statusEnum(): StatusDfd
    {
        return StatusDfd::from($this->status);
    }

    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    public function versoes(): HasMany
    {
        return $this->hasMany(DfdVersao::class, 'dfd_id')->orderBy('versao');
    }

    public function elaborador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'elaborado_por');
    }

    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}
