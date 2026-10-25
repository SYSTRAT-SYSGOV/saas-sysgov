<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

final class NutritionPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.view')
            || $this->checkPermission($user, 'educa.merenda.manage')
            || $this->checkPermission($user, 'educa.merenda.cardapios.view')
            || $this->checkPermission($user, 'educa.merenda.restricoes.view')
            || $this->checkPermission($user, 'educa.merenda.refeicoes.view');
    }

    public function viewCardapios(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.cardapios.view')
            || $this->checkPermission($user, 'educa.merenda.cardapios.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function manageCardapios(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.cardapios.manage')
            || $this->checkPermission($user, 'educa.merenda.cardapios.create')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function homologarCardapios(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.cardapios.homologar')
            || $this->checkPermission($user, 'educa.merenda.cardapios.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function viewRestricoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.restricoes.view')
            || $this->checkPermission($user, 'educa.merenda.restricoes.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function manageRestricoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.restricoes.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function viewRefeicoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.refeicoes.view')
            || $this->checkPermission($user, 'educa.merenda.refeicoes.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    public function manageRefeicoes(User $user): bool
    {
        return $this->checkPermission($user, 'educa.merenda.refeicoes.manage')
            || $this->checkPermission($user, 'educa.merenda.manage');
    }

    private function checkPermission(User $user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (\Throwable) {
            return false;
        }
    }
}
