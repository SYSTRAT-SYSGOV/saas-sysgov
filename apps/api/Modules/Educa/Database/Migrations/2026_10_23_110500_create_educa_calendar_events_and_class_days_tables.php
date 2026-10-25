<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Eventos e Anotações do Calendário Escolar
        Schema::create('educa_calendar_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('calendario_id')->constrained('educa_academic_calendars')->cascadeOnDelete();
            $table->foreignUuid('calendar_day_id')->nullable()->constrained('educa_calendar_days')->nullOnDelete();
            $table->date('data');
            $table->string('titulo', 120);
            $table->text('descricao')->nullable();
            $table->string('tipo_evento', 30); // pedagogico, administrativo, comemorativo, reuniao, avaliacao
            $table->string('horario_inicio', 5)->nullable();
            $table->string('horario_fim', 5)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'calendario_id', 'data']);
            $table->index(['tenant_id', 'tipo_evento']);
        });

        // 2. Turmas vinculadas especificamente a um dia do calendário (Reposição / Dias Extras)
        Schema::create('educa_calendar_day_classes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('calendar_day_id')->constrained('educa_calendar_days')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'calendar_day_id', 'school_class_id'], 'educa_cal_day_class_unique');
            $table->index(['tenant_id', 'school_class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_calendar_day_classes');
        Schema::dropIfExists('educa_calendar_events');
    }
};
