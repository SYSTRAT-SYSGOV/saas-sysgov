<?php

declare(strict_types=1);

namespace Modules\Ata\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Modules\Ata\Enums\StatusAta;
use Modules\OrgChart\Models\OrgUnit;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $org_unit_id
 * @property int|null $tipo_id
 * @property int $numero
 * @property int $ano
 * @property string $titulo
 * @property string|null $conteudo_html
 * @property Carbon $data_reuniao
 * @property string|null $local
 * @property string|null $cidade
 * @property string $redator
 * @property bool $sigilosa
 * @property StatusAta $status
 * @property string $codigo_validacao
 * @property string|null $pdf_path
 * @property string|null $pdf_sha256
 * @property int $criado_por
 * @property int|null $finalizada_por
 * @property Carbon|null $rascunho_em
 * @property Carbon|null $finalizada_em
 * @property Carbon|null $created_at
 * @property-read OrgUnit|null $secretaria
 * @property-read AtaTipo|null $tipo
 * @property-read User|null $autor
 * @property-read \Illuminate\Database\Eloquent\Collection<int, AtaParticipante> $participantes
 */
final class Ata extends Model
{
    use TenantAware;

    protected $table = 'atas';

    protected $fillable = [
        'tenant_id', 'org_unit_id', 'tipo_id', 'numero', 'ano', 'titulo', 'conteudo_html', 'data_reuniao', 'local', 'cidade',
        'redator', 'sigilosa', 'status', 'codigo_validacao', 'pdf_path', 'pdf_sha256', 'criado_por', 'finalizada_por',
        'rascunho_em', 'finalizada_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'tipo_id' => 'integer',
        'numero' => 'integer',
        'ano' => 'integer',
        'data_reuniao' => 'datetime',
        'sigilosa' => 'boolean',
        'status' => StatusAta::class,
        'criado_por' => 'integer',
        'finalizada_por' => 'integer',
        'rascunho_em' => 'datetime',
        'finalizada_em' => 'datetime',
    ];

    /** Número no formato da ata impressa: 03/2026. */
    public function numeroFormatado(): string
    {
        return str_pad((string) $this->numero, 2, '0', STR_PAD_LEFT) . '/' . $this->ano;
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function secretaria(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    /** @return BelongsTo<AtaTipo, $this> */
    public function tipo(): BelongsTo
    {
        return $this->belongsTo(AtaTipo::class, 'tipo_id');
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    /** @return HasMany<AtaParticipante, $this> */
    public function participantes(): HasMany
    {
        return $this->hasMany(AtaParticipante::class, 'ata_id')->orderBy('ordem')->orderBy('id');
    }
}
