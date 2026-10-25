<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Motivos de Dia (Feriados, Recesso, Sábado Letivo, Planejamento)
        Schema::create('educa_calendar_day_reasons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->uuid('school_id')->nullable()->index(); // null = motivo da rede municipal
            $table->string('codigo', 20); // ex: FERIADO_NACIONAL, SABADO_LETIVO
            $table->string('nome', 100);
            $table->string('tipo', 30); // regular_school_day, extra_school_day, holiday, recess, pedagogical_planning
            $table->boolean('is_school_day')->default(false);
            $table->string('color_hex', 7)->default('#2563EB');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'school_id', 'codigo']);
            $table->index(['tenant_id', 'tipo']);
        });

        // 2. Calendários Escolares (Padrão da Rede ou Específico por Escola)
        Schema::create('educa_academic_calendars', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->uuid('school_id')->nullable()->index(); // null = Matriz da Secretaria (SME)
            $table->unsignedSmallInteger('ano');
            $table->string('nome', 150);
            $table->string('status', 20)->default('draft'); // draft, published, locked
            $table->unsignedSmallInteger('carga_horaria_diaria_minutos')->default(240); // 4h = 240min
            $table->unsignedSmallInteger('total_school_days')->default(0);
            $table->decimal('total_school_hours', 6, 2)->default(0.00);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'ano', 'school_id']);
            $table->index(['tenant_id', 'status']);
        });

        // 3. Dias do Calendário (Com data ISO única)
        Schema::create('educa_calendar_days', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('calendario_id')->constrained('educa_academic_calendars')->cascadeOnDelete();
            $table->date('data');
            $table->unsignedTinyInteger('dia_da_semana'); // 1 = Domingo ... 7 = Sábado
            $table->foreignUuid('motivo_id')->nullable()->constrained('educa_calendar_day_reasons')->nullOnDelete();
            $table->boolean('is_school_day')->default(true);
            $table->string('origem', 10)->default('escola'); // escola, rede
            $table->string('descricao', 255)->nullable();
            $table->unsignedSmallInteger('carga_horaria_minutos')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'calendario_id', 'data']);
            $table->index(['tenant_id', 'calendario_id', 'is_school_day']);
            $table->index(['tenant_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_calendar_days');
        Schema::dropIfExists('educa_academic_calendars');
        Schema::dropIfExists('educa_calendar_day_reasons');
    }
};
