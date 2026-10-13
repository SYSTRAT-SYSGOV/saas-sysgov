<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Support\EscolaContext;

/**
 * Regras "exists" restritas ao tenant da requisição, à escola de trabalho (tabelas com
 * escola_id) e a registros não excluídos: um id de outro tenant ou de outra escola falha na
 * validação em vez de ser aceito.
 */
trait RegrasDoTenant
{
    private function existeNoTenant(string $tabela, bool $comSoftDelete = true): Exists
    {
        $regra = Rule::exists($tabela, 'id')->where('tenant_id', app(TenantContext::class)->id());

        $escola = app(EscolaContext::class);
        if ($escola->hasEscola() && self::temEscolaId($tabela)) {
            $regra->where('escola_id', $escola->id());
        }

        return $comSoftDelete ? $regra->whereNull('deleted_at') : $regra;
    }

    private static function temEscolaId(string $tabela): bool
    {
        /** @var array<string, bool> $cache */
        static $cache = [];

        return $cache[$tabela] ??= Schema::hasColumn($tabela, 'escola_id');
    }

    /** Usuário vinculado ativamente ao tenant (professor). */
    private function usuarioDoTenant(): Exists
    {
        return Rule::exists('tenant_user', 'user_id')
            ->where('tenant_id', app(TenantContext::class)->id())
            ->where('status', 'active');
    }

    /** Autoriza "update" se a rota traz o model, senão "create" na classe. */
    private function podeSalvar(string $parametroRota, string $classe): bool
    {
        $modelo = $this->route($parametroRota);

        return $modelo instanceof Model
            ? $this->user()?->can('update', $modelo) === true
            : $this->user()?->can('create', $classe) === true;
    }
}
