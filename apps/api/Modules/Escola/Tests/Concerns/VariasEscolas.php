<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Concerns;

use App\Models\Tenant;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;

/**
 * Apoio aos testes de várias escolas no mesmo tenant, para os módulos que dependem do Escola
 * (Pedagógico, Formatura, Passeio). Exige o `noTenant()` do cenário do módulo.
 */
trait VariasEscolas
{
    abstract protected function noTenant(Tenant $tenant, callable $acao): mixed;

    protected function novaEscola(Tenant $tenant, string $nome): Escola
    {
        return $this->noTenant($tenant, fn (): Escola => Escola::create(['nome' => $nome]));
    }

    protected function naEscola(Tenant $tenant, Escola $escola, callable $acao): mixed
    {
        $context = app(EscolaContext::class);

        return $this->noTenant($tenant, function () use ($context, $escola, $acao): mixed {
            $context->set($escola);
            try {
                return $acao();
            } finally {
                $context->clear();
            }
        });
    }
}
