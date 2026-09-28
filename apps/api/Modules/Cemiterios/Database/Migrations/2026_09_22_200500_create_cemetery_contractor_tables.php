<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('cemetery_contractor_penalties');
        Schema::dropIfExists('cemetery_work_permits');
        Schema::dropIfExists('cemetery_contractor_licenses');
        Schema::dropIfExists('cemetery_contractors');

        Schema::create('cemetery_contractors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_doc', 4);
            $table->text('documento');   // cifrado (RN-05)
            $table->string('documento_hash', 64);
            $table->string('nome');
            $table->string('responsavel_tecnico')->nullable();
            $table->text('contatos')->nullable(); // cifrado
            $table->string('situacao', 12)->default('inapto'); // apto | inapto | suspenso | cancelado
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'documento_hash']);
            $table->index(['tenant_id', 'situacao']);
        });

        Schema::create('cemetery_contractor_licenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('contractor_id')->constrained('cemetery_contractors')->cascadeOnDelete();
            $table->string('numero', 40);
            $table->date('validade');
            $table->string('arquivo')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'contractor_id', 'validade'], 'ccl_tenant_contractor_val_idx');
        });

        Schema::create('cemetery_work_permits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('contractor_id')->constrained('cemetery_contractors')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->text('descricao');
            $table->decimal('comprimento_m', 5, 2);
            $table->decimal('largura_m', 5, 2);
            $table->date('prazo_fim');
            $table->string('situacao', 12)->default('pendente'); // pendente | concluida | cancelada
            $table->boolean('sinalizada')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'contractor_id', 'situacao'], 'cwp_tenant_contractor_sit_idx');
        });

        Schema::create('cemetery_contractor_penalties', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('contractor_id')->constrained('cemetery_contractors')->cascadeOnDelete();
            $table->string('tipo', 12); // advertencia | suspensao
            $table->date('inicio')->nullable();
            $table->date('fim')->nullable();
            $table->text('motivo');
            $table->string('arquivo')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'contractor_id'], 'ccp_tenant_contractor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_contractor_penalties');
        Schema::dropIfExists('cemetery_work_permits');
        Schema::dropIfExists('cemetery_contractor_licenses');
        Schema::dropIfExists('cemetery_contractors');
    }
};
