<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

use App\Support\TenantContext;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rule;

/** Validação de ids do próprio tenant (impede referenciar registro de outra prefeitura). */
final class Vinculos
{
    public static function existe(string $tabela, bool $comExclusaoLogica = false): Exists
    {
        $regra = Rule::exists($tabela, 'id')->where('tenant_id', app(TenantContext::class)->id());

        return $comExclusaoLogica ? $regra->whereNull('deleted_at') : $regra;
    }
}
