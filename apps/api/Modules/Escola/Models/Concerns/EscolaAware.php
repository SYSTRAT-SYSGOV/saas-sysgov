<?php

declare(strict_types=1);

namespace Modules\Escola\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use LogicException;
use Modules\Escola\Support\EscolaContext;

/**
 * Isolamento por escola (D1), no mesmo molde do TenantAware: com escola no contexto, toda
 * consulta é filtrada por `escola_id` e todo registro novo nasce nela, ignorando o que vier do
 * cliente. Sem contexto (fora de requisição), o registro vai para a escola explícita ou para a
 * escola única do tenant; com várias escolas e nenhuma definida, a criação é recusada.
 */
trait EscolaAware
{
    protected static function bootEscolaAware(): void
    {
        static::addGlobalScope('escola', function (Builder $query): void {
            $context = app(EscolaContext::class);
            if ($context->hasEscola()) {
                $query->where($query->getModel()->qualifyColumn('escola_id'), $context->id());
            }
        });

        static::creating(function (Model $model): void {
            $context = app(EscolaContext::class);
            if ($context->hasEscola()) {
                $model->setAttribute('escola_id', $context->id());

                return;
            }
            if ($model->getAttribute('escola_id') !== null) {
                return;
            }
            $escola = $context->escolaUnicaDoTenant()
                ?? throw new LogicException('Não é permitido criar registro escolar sem escola definida.');
            $model->setAttribute('escola_id', $escola->id);
        });
    }
}
