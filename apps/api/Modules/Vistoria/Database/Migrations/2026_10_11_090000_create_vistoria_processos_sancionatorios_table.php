<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_processos_sancionatorios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('documento_id')->constrained('vistoria_documentos')->cascadeOnDelete();
            $table->string('status', 30); // aberto, em_defesa, em_julgamento, penalidade_aplicada, arquivado, em_recurso, concluido

            $table->date('prazo_defesa_limite');
            $table->text('defesa_texto')->nullable();
            $table->timestamp('defesa_apresentada_em')->nullable();

            $table->string('julgamento_decisao', 20)->nullable(); // procedente, improcedente
            $table->text('julgamento_fundamentacao')->nullable();
            $table->unsignedBigInteger('penalidade_centavos')->nullable();
            $table->timestamp('julgado_em')->nullable();
            $table->foreignId('julgado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->date('prazo_recurso_limite')->nullable();
            $table->text('recurso_texto')->nullable();
            $table->timestamp('recurso_apresentado_em')->nullable();
            $table->string('recurso_decisao', 20)->nullable(); // provido, improvido
            $table->text('recurso_fundamentacao')->nullable();
            $table->timestamp('recurso_decidido_em')->nullable();
            $table->foreignId('recurso_decidido_por')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('concluido_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'documento_id'], 'vistoria_processo_documento_unq');
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_processos_sancionatorios');
    }
};
