<?php

declare(strict_types=1);

namespace Modules\Campanha\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use LogicException;
use Modules\Campanha\Support\CampanhaContext;

/**
 * Isolamento por campanha (D2), no molde do EscolaAware: com campanha no contexto, toda consulta é
 * filtrada por `campanha_id` e todo registro novo nasce nela, ignorando o que vier do cliente. Sem
 * contexto, o registro precisa trazer a campanha explicitamente.
 */
trait CampanhaAware
{
    protected static function bootCampanhaAware(): void
    {
        static::addGlobalScope('campanha', function (Builder $query): void {
            $context = app(CampanhaContext::class);
            if ($context->hasCampanha()) {
                $query->where($query->getModel()->qualifyColumn('campanha_id'), $context->id());
            }
        });

        static::creating(function (Model $model): void {
            $context = app(CampanhaContext::class);
            if ($context->hasCampanha()) {
                $model->setAttribute('campanha_id', $context->id());

                return;
            }
            if ($model->getAttribute('campanha_id') === null) {
                throw new LogicException('Não é permitido criar registro de campanha sem campanha definida.');
            }
        });
    }
}
