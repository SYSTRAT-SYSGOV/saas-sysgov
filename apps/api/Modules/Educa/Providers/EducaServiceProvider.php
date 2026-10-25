<?php

declare(strict_types=1);

namespace Modules\Educa\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\Gate;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCalendarDayReason;
use Modules\Educa\Policies\AcademicCalendarPolicy;
use Modules\Educa\Policies\AcademicYearPolicy;
use Modules\Educa\Policies\CalendarDayReasonPolicy;

final class EducaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(EducaAcademicYear::class, AcademicYearPolicy::class);
        Gate::policy(EducaAcademicCalendar::class, AcademicCalendarPolicy::class);
        Gate::policy(EducaCalendarDayReason::class, CalendarDayReasonPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaSchool::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCourse::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaGrade::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaKnowledgeArea::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCurriculumComponent::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCurriculumMatrix::class, \Modules\Educa\Policies\SchoolPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaSchoolClass::class, \Modules\Educa\Policies\SchoolClassPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaEnrollment::class, \Modules\Educa\Policies\EnrollmentPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaStudentProfile::class, \Modules\Educa\Policies\StudentProfilePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaClassDiary::class, \Modules\Educa\Policies\ClassDiaryPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAttendanceRecord::class, \Modules\Educa\Policies\AttendancePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaEvaluationRule::class, \Modules\Educa\Policies\EvaluationRulePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaEmployee::class, \Modules\Educa\Policies\EmployeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaEmployeeAllocation::class, \Modules\Educa\Policies\EmployeeAllocationPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCensusExport::class, \Modules\Educa\Policies\EducacensoPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCensusValidation::class, \Modules\Educa\Policies\EducacensoPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaCensusInepLog::class, \Modules\Educa\Policies\EducacensoPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTransportRoute::class, \Modules\Educa\Policies\TransportPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTransportVehicle::class, \Modules\Educa\Policies\TransportPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTransportDriver::class, \Modules\Educa\Policies\TransportPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTransportStudentAllocation::class, \Modules\Educa\Policies\TransportPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAnnouncement::class, \Modules\Educa\Policies\CommunicationPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaStudentIncident::class, \Modules\Educa\Policies\CommunicationPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTimetable::class, \Modules\Educa\Policies\TimetablePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTimetableSlot::class, \Modules\Educa\Policies\TimetablePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaTimetableLesson::class, \Modules\Educa\Policies\TimetablePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaMenu::class, \Modules\Educa\Policies\NutritionPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaMenuItem::class, \Modules\Educa\Policies\NutritionPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaDietaryRestriction::class, \Modules\Educa\Policies\NutritionPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaMealLog::class, \Modules\Educa\Policies\NutritionPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaSchoolCapacity::class, \Modules\Educa\Policies\SchoolCapacityPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaEnrollmentApplication::class, \Modules\Educa\Policies\SchoolCapacityPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaWaitlist::class, \Modules\Educa\Policies\SchoolCapacityPolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeeStudentProfile::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeePei::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeePeiGoal::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeeResourceRoom::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeeEnrollment::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaAeeSupportAllocation::class, \Modules\Educa\Policies\AeePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoCronograma::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoPreConselho::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoPreConselhoAluno::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoAta::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoDeliberacaoAluno::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
        Gate::policy(\Modules\Educa\Models\EducaConselhoMembro::class, \Modules\Educa\Policies\ConselhoClassePolicy::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}