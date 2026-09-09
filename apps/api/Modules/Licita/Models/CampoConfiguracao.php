<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Configuração, por tenant e por tipo de documento (valores de
 * Modules\Licita\Enums\FaseLicita), dos campos extras que aquele órgão
 * exige na elaboração do artefato — reflete a realidade de que cada
 * órgão pode ter legislação própria (ex.: decreto municipal) com
 * exigências além da Lei 14.133/2021.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo_documento
 * @property array<int, array{key: string, label: string, tipo: string, opcoes?: array<int, string>, obrigatorio: bool, ordem: int, ajuda?: string}> $campos
 * @property bool $ativo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class CampoConfiguracao extends Model
{
    use TenantAware;

    protected $table = 'licita_campo_configuracoes';

    protected $fillable = [
        'tenant_id',
        'tipo_documento',
        'campos',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'campos' => 'array',
        'ativo' => 'boolean',
    ];
}
