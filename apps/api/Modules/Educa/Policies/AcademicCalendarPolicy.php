<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Educa\Models\EducaAcademicCalendar;

final class AcademicCalendarPolicy
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
        return $this->checkPermission($user, 'educa.core.calendarios.view');
    }

    public function view(User $user, EducaAcademicCalendar $calendar): bool
    {
        return $this->checkPermission($user, 'educa.core.calendarios.view');
    }

    public function create(User $user): bool
    {
        return $this->manage($user);
    }

    public function update(User $user, EducaAcademicCalendar $calendar): bool
    {
        return $this->manage($user, $calendar);
    }

    public function manage(User $user, ?EducaAcademicCalendar $calendar = null): bool
    {
        return $this->checkPermission($user, 'educa.core.calendarios.manage');
    }

    public function publish(User $user, EducaAcademicCalendar $calendar): bool
    {
        return $this->checkPermission($user, 'educa.core.calendarios.publish');
    }

    public function delete(User $user, EducaAcademicCalendar $calendar): bool
    {
        return $this->checkPermission($user, 'educa.core.calendarios.delete');
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
