<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Policies\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Checagem de tenant comum às Policies do módulo (mesmo padrão de
 * Modules\Cursos\Policies\Concerns\PermissoesCursos).
 *
 * Defesa em profundidade: o objeto tem de ser do tenant da requisição, mesmo
 * que um binding de rota o tenha carregado sem o filtro do TenantAware.
 * Antes desta correção, as Policies chamavam `$user->belongsToTenant(...)`,
 * um método que nunca existiu em App\Models\User — qualquer verificação de
 * tenant quebrava com erro fatal em tempo de execução.
 */
trait PermissoesRequerimentos
{
    private function doTenant(Model $objeto): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && (int) $objeto->getAttribute('tenant_id') === $context->id();
    }
}
