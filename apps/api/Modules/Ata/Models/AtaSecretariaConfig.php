<?php

declare(strict_types=1);

namespace Modules\Ata\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Configuração da ata por secretaria do Organograma (D1): sigla e papel timbrado (fundo do PDF).
 *
 * @property int $id
 * @property int $org_unit_id
 * @property string|null $sigla
 * @property string|null $timbrado_path
 * @property string|null $timbrado_mime
 * @property-read OrgUnit $secretaria
 */
final class AtaSecretariaConfig extends Model
{
    use TenantAware;

    protected $table = 'ata_secretaria_configs';

    protected $fillable = ['tenant_id', 'org_unit_id', 'sigla', 'timbrado_path', 'timbrado_mime'];

    protected $casts = ['tenant_id' => 'integer', 'org_unit_id' => 'integer'];

    /** @return BelongsTo<OrgUnit, $this> */
    public function secretaria(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }
}
