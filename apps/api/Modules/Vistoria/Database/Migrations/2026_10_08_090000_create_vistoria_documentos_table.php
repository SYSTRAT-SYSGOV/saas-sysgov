<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('execucao_id')->constrained('vistoria_execucoes')->cascadeOnDelete();
            $table->foreignId('autuado_pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->string('tipo', 30); // auto_infracao, notificacao, termo_embargo, termo_apreensao
            $table->string('numero', 60); // formato "{tipo}/{numero_sequencial}/{exercicio}"
            $table->unsignedInteger('numero_sequencial');
            $table->unsignedInteger('exercicio');
            $table->text('irregularidade')->nullable();
            $table->text('enquadramento_legal')->nullable();
            $table->unsignedInteger('prazo_dias')->nullable();
            $table->date('prazo_limite')->nullable();
            $table->json('dados_autuado')->nullable()->comment('Snapshot do autuado no Cadastro Único no momento da emissão');
            $table->string('caminho_pdf', 255)->nullable();
            $table->string('assinatura_status', 20)->default('pendente'); // pendente, assinada, recusada (seção 7 implementa a transição)
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'numero'], 'vistoria_documento_numero_unq');
            $table->index(['tenant_id', 'execucao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_documentos');
    }
};
