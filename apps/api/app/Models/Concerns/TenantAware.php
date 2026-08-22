<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use LogicException;

trait TenantAware
{
    protected static function bootTenantAware(): void
    {
        static::addGlobalScope('tenant', function (Builder $query): void {
            $context = app(TenantContext::class);
            if ($context->hasTenant()) $query->where($query->getModel()->qualifyColumn('tenant_id'), $context->id());
        });
        static::creating(function (Model $model): void {
            $context = app(TenantContext::class);
            if (!$context->hasTenant()) throw new LogicException('Não é permitido criar registro sem tenant.');
            $model->setAttribute('tenant_id', $context->id());
        });
    }
}
