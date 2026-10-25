<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Rotas e Itinerários de Transporte Escolar
        Schema::create('educa_transport_routes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('nome', 100);
            $table->string('turno', 20); // matutino, vespertino, noturno, integral
            $table->string('tipo_rota', 20); // urbana, rural, mista
            $table->decimal('quilometragem_estimada', 8, 2)->default(0);
            $table->string('horario_saida', 10)->nullable();
            $table->string('horario_chegada', 10)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo'], 'uq_transp_routes_tenant_codigo');
            $table->index(['tenant_id', 'turno'], 'idx_transp_routes_tenant_turno');
            $table->index(['tenant_id', 'tipo_rota'], 'idx_transp_routes_tenant_tipo');
            $table->index(['tenant_id', 'ativo'], 'idx_transp_routes_tenant_ativo');
        });

        // 2. Pontos de Parada da Rota
        Schema::create('educa_transport_stops', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('route_id')->constrained('educa_transport_routes')->cascadeOnDelete();
            $table->unsignedSmallInteger('ordem');
            $table->string('nome', 100);
            $table->string('referencia', 255)->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('horario_estimado', 10)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'route_id', 'ordem'], 'idx_transp_stops_route_ordem');
        });

        // 3. Escolas Atendidas pela Rota (Pivô)
        Schema::create('educa_transport_route_schools', function (Blueprint $table): void {
            $table->foreignUuid('route_id')->constrained('educa_transport_routes')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['route_id', 'school_id']);
        });

        // 4. Frota de Veículos
        Schema::create('educa_transport_vehicles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('placa', 10);
            $table->string('renavam', 20)->nullable();
            $table->string('marca_modelo', 100);
            $table->unsignedSmallInteger('ano_fabricacao');
            $table->string('tipologia', 20); // onibus, microonibus, van, embarcacao, outros
            $table->string('tipo_propriedade', 20); // proprio, terceirizado
            $table->unsignedSmallInteger('capacidade_passageiros');
            $table->unsignedSmallInteger('ocupacao_efetiva')->default(0);
            $table->string('status', 20)->default('regular'); // regular, em_manutencao, interditado
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'placa'], 'uq_transp_vehicles_tenant_placa');
            $table->index(['tenant_id', 'status'], 'idx_transp_vehicles_tenant_status');
            $table->index(['tenant_id', 'tipologia'], 'idx_transp_vehicles_tenant_tipologia');
        });

        // 5. Vistorias Semestrais do DETRAN
        Schema::create('educa_transport_inspections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('vehicle_id')->constrained('educa_transport_vehicles')->cascadeOnDelete();
            $table->string('numero_laudo', 50);
            $table->string('orgao_emissor', 50)->default('DETRAN');
            $table->date('data_vistoria');
            $table->date('data_validade');
            $table->string('resultado', 20)->default('aprovado'); // aprovado, reprovado, com_restricoes
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'vehicle_id', 'data_validade'], 'idx_transp_insp_vehicle_val');
        });

        // 6. Condutores e Monitores Credenciados
        Schema::create('educa_transport_drivers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo_funcao', 20)->default('motorista'); // motorista, monitor
            $table->string('cnh_numero', 30)->nullable();
            $table->string('cnh_categoria', 5)->nullable(); // B, C, D, E
            $table->date('cnh_validade')->nullable();
            $table->boolean('curso_transporte_escolar')->default(false);
            $table->date('validade_curso')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'pessoa_id', 'tipo_funcao'], 'uq_transp_drivers_pessoa_funcao');
            $table->index(['tenant_id', 'ativo'], 'idx_transp_drivers_tenant_ativo');
        });

        // 7. Alocações Nominais de Estudantes
        Schema::create('educa_transport_student_allocations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('route_id')->constrained('educa_transport_routes')->cascadeOnDelete();
            $table->foreignUuid('vehicle_id')->constrained('educa_transport_vehicles')->cascadeOnDelete();
            $table->foreignUuid('stop_id')->constrained('educa_transport_stops')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->foreignId('aluno_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->string('status', 20)->default('ativa'); // ativa, encerrada
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'route_id', 'status'], 'idx_transp_alloc_route_status');
            $table->index(['tenant_id', 'vehicle_id', 'status'], 'idx_transp_alloc_vehicle_status');
            $table->index(['tenant_id', 'enrollment_id', 'status'], 'idx_transp_alloc_enr_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_transport_student_allocations');
        Schema::dropIfExists('educa_transport_drivers');
        Schema::dropIfExists('educa_transport_inspections');
        Schema::dropIfExists('educa_transport_vehicles');
        Schema::dropIfExists('educa_transport_route_schools');
        Schema::dropIfExists('educa_transport_stops');
        Schema::dropIfExists('educa_transport_routes');
    }
};
