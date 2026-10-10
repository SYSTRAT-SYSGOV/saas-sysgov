<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Escola do órgão (change educacao-multiescola-e-cadastro-pessoas, D1/D2). O tenant é a
 * prefeitura; cada escola é ligada a uma unidade do organograma, que define quem a acessa.
 * Escola migrada da antiga "unidade" pode estar sem unidade (org_unit_id nulo): nesse caso
 * vale o acesso ao módulo, como antes.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $org_unit_id
 * @property string $nome
 * @property string|null $inep
 * @property string|null $logo_path
 * @property bool $ativa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read OrgUnit|null $orgUnit
 */
final class Escola extends Model
{
    use TenantAware;

    protected $table = 'escola_escolas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'org_unit_id', 'nome', 'inep', 'logo_path', 'ativa'];

    /** @var array<string, mixed> */
    protected $attributes = ['ativa' => true];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'org_unit_id' => 'integer', 'ativa' => 'boolean'];

    /** @var list<string> */
    protected $hidden = ['logo_path'];

    /** @var list<string> */
    protected $appends = ['tem_logo'];

    public function getTemLogoAttribute(): bool
    {
        return $this->logo_path !== null;
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }
}
