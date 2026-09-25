<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('cemetery_succession_heirs');
        Schema::dropIfExists('cemetery_succession_processes');
        Schema::dropIfExists('cemetery_operators');

        // 1. Processos de Regularização de Sucessão Hereditária
        Schema::create('cemetery_succession_processes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('concession_id')->constrained('concessions')->cascadeOnDelete();
            $table->string('numero_processo', 50);
            $table->string('tipo_documento', 30); // inventario_judicial | inventario_extrajudicial | alvara_judicial | outro
            $table->string('vara_ou_cartorio', 100)->nullable();
            $table->string('situacao', 20)->default('em_analise'); // em_analise | deferido | indeferido | cancelado
            $table->text('despacho_fundamentacao')->nullable();
            $table->foreignId('novo_titular_id')->nullable()->constrained('concession_holders')->nullOnDelete();
            $table->string('termo_numero', 50)->nullable();
            $table->dateTime('deferido_em')->nullable();
            $table->foreignId('deferido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'concession_id'], 'csp_tenant_concession_idx');
            $table->index(['tenant_id', 'situacao'], 'csp_tenant_situacao_idx');
            $table->index(['tenant_id', 'numero_processo'], 'csp_tenant_processo_idx');
        });

        // 2. Herdeiros / Requerentes da Sucessão
        Schema::create('cemetery_succession_heirs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('process_id')->constrained('cemetery_succession_processes')->cascadeOnDelete();
            $table->string('nome', 255);
            $table->string('parentesco', 30); // conjuge | filho | neto | irmao | meeiro | legatario | outro
            $table->string('documento', 20)->nullable();
            $table->string('telefone', 30)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('titular_indicado')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'process_id'], 'csh_tenant_process_idx');
        });

        // 3. Coveiros e Pedreiros Credenciados
        Schema::create('cemetery_operators', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 255);
            $table->string('tipo', 20); // coveiro | pedreiro
            $table->string('cpf_cnpj', 20)->nullable();
            $table->string('documento_hash', 64)->nullable();
            $table->string('matricula_funcional', 30)->nullable();
            $table->string('alvara_numero', 50)->nullable();
            $table->date('alvara_validade')->nullable();
            $table->string('telefone', 30)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('situacao', 20)->default('ativo'); // ativo | suspenso | inativo
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'tipo', 'situacao'], 'co_tenant_tipo_sit_idx');
            $table->index(['tenant_id', 'alvara_validade'], 'co_tenant_alvara_val_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_operators');
        Schema::dropIfExists('cemetery_succession_heirs');
        Schema::dropIfExists('cemetery_succession_processes');
    }
};
