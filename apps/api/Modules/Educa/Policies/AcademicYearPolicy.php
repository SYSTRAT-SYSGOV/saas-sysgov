<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Educa\Models\EducaAcademicYear;

final class AcademicYearPolicy
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
        return $this->checkPermission($user, 'educa.core.anos_letivos.view');
    }

    public function view(User $user, EducaAcademicYear $academicYear): bool
    {
        return $this->checkPermission($user, 'educa.core.anos_letivos.view');
    }

    public function create(User $user): bool
    {
        return $this->checkPermission($user, 'educa.core.anos_letivos.create');
    }

    public function update(User $user, EducaAcademicYear $academicYear): bool
    {
        return $this->checkPermission($user, 'educa.core.anos_letivos.update');
    }

    public function delete(User $user, EducaAcademicYear $academicYear): bool
    {
        return $this->checkPermission($user, 'educa.core.anos_letivos.delete');
    }

    public function transition(User $user, EducaAcademicYear $academicYear, string $event): bool
    {
        $permission = match ($event) {
            'start' => 'educa.core.anos_letivos.open',
            'freeze', 'resume' => 'educa.core.anos_letivos.freeze',
            'begin_evaluation' => 'educa.core.anos_letivos.update',
            'close' => 'educa.core.anos_letivos.close',
            default => 'educa.core.anos_letivos.update',
        };

        return $this->checkPermission($user, $permission);
    }

    public function batch(User $user): bool
    {
        return $this->checkPermission($user, 'educa.core.anos_letivos.batch');
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
