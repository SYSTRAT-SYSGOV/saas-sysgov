<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('concession_holders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome');
            $table->string('tipo_doc', 4); // cpf | cnpj
            $table->text('documento');          // cifrado (RN-05)
            $table->string('documento_hash', 64);
            $table->text('email')->nullable();    // cifrado
            $table->text('telefone')->nullable(); // cifrado
            $table->string('endereco')->nullable();
            $table->string('base_legal', 40)->default('execucao_contrato');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'documento_hash']);
            $table->index(['tenant_id', 'nome']);
        });

        Schema::create('concessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('numero', 30);
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->foreignId('holder_id')->constrained('concession_holders')->cascadeOnDelete();
            $table->string('modalidade', 12); // temporaria | perpetua
            $table->date('inicio');
            $table->date('termino')->nullable();
            $table->string('situacao', 12)->default('vigente'); // vigente | expirada | extinta
            $table->date('notificado_para_termino')->nullable();
            $table->boolean('pendencia_regularizacao')->default(false);
            $table->boolean('sujeita_taxa_anual')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'numero']);
            $table->index(['tenant_id', 'situacao', 'termino']);
            $table->index(['tenant_id', 'plot_id', 'situacao']);
        });

        // Solicitações feitas pelo concessionário no portal (renovação, correção de dados).
        Schema::create('cemetery_holder_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('holder_id')->constrained('concession_holders')->cascadeOnDelete();
            $table->foreignId('concession_id')->nullable()->constrained('concessions')->nullOnDelete();
            $table->string('tipo', 20); // renovacao | correcao_dados
            $table->text('mensagem');
            $table->string('situacao', 12)->default('aberta');
            $table->timestamps();

            $table->index(['tenant_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_holder_requests');
        Schema::dropIfExists('concessions');
        Schema::dropIfExists('concession_holders');
    }
};
