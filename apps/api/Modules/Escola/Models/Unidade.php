<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Configuração da unidade escolar do tenant (nome e logo usados nos relatórios). Uma por tenant.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $logo_path
 */
final class Unidade extends Model
{
    use TenantAware;

    protected $table = 'escola_unidades';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'nome', 'logo_path'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer'];

    /** @var list<string> */
    protected $hidden = ['logo_path'];

    /** @var list<string> */
    protected $appends = ['tem_logo'];

    public function getTemLogoAttribute(): bool
    {
        return $this->logo_path !== null;
    }
}
