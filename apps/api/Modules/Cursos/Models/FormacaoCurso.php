<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Pivot formação × curso. O tenant_id é passado explicitamente no
 * attach/sync (o TenantAware não age em pivot).
 *
 * @property int $tenant_id
 * @property int $formacao_id
 * @property int $curso_id
 * @property int $ordem
 * @property bool $obrigatorio
 */
final class FormacaoCurso extends Pivot
{
    protected $table = 'cursos_formacao_cursos';

    public $incrementing = true;

    protected $casts = [
        'tenant_id' => 'integer',
        'ordem' => 'integer',
        'obrigatorio' => 'boolean',
    ];
}
