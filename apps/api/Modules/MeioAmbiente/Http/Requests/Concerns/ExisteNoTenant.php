<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests\Concerns;

use App\Support\TenantContext;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * `exists` restrito ao tenant atual — a regra `exists:tabela,id` pura consulta a tabela
 * inteira e aceitaria o id de um registro de outro órgão (mesmo padrão já usado no
 * módulo Cursos com `Rule::exists(...)->where('tenant_id', ...)`).
 */
trait ExisteNoTenant
{
    protected function existeNoTenant(string $tabela): Exists
    {
        return Rule::exists($tabela, 'id')->where('tenant_id', app(TenantContext::class)->id());
    }
}
