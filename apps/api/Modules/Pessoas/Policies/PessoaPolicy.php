<?php

declare(strict_types=1);

namespace Modules\Pessoas\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Pessoas\Models\Pessoa;

final readonly class PessoaPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.view');
    }

    public function view(User $user, Pessoa $pessoa): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.view')
            && $this->mesmoTenant($user, $pessoa);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.create');
    }

    public function update(User $user, Pessoa $pessoa): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.update')
            && $this->mesmoTenant($user, $pessoa);
    }

    /**
     * Regra de integridade de recurso: nega exclusão caso a pessoa possua vínculos ativos/vigentes.
     */
    public function delete(User $user, Pessoa $pessoa): bool
    {
        if (! $this->temPermissao($user, 'cadastros.pessoas.delete') || ! $this->mesmoTenant($user, $pessoa)) {
            return false;
        }

        $hoje = today()->toDateString();

        $possuiVinculosAtivos = $pessoa->vinculos()
            ->where(function ($query) use ($hoje): void {
                $query->whereNull('fim')
                    ->orWhere('fim', '>=', $hoje);
            })
            ->exists();

        return ! $possuiVinculosAtivos;
    }

    public function promote(User $user, Pessoa $pessoa): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.promote')
            && $this->mesmoTenant($user, $pessoa);
    }

    public function import(User $user): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.import');
    }

    public function viewSensitive(User $user, Pessoa $pessoa): bool
    {
        return $this->temPermissao($user, 'cadastros.pessoas.view_sensitive')
            && $this->mesmoTenant($user, $pessoa);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, Pessoa $pessoa): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $pessoa->tenant_id === $tenantId;
    }
}
