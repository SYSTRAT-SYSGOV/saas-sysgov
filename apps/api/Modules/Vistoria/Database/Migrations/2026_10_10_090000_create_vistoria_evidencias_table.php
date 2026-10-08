<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_evidencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('execucao_id')->constrained('vistoria_execucoes')->cascadeOnDelete();
            $table->foreignId('pergunta_id')->nullable()->constrained('vistoria_perguntas')->nullOnDelete();
            $table->string('tipo', 30); // foto, documento_complementar
            $table->string('categoria', 30)->nullable(); // nota_fiscal, licenca, laudo, outro (documento_complementar)
            $table->text('descricao')->nullable();
            $table->string('caminho_original', 255)->comment('Arquivo original, sem marca d\'água');
            $table->string('caminho_processado', 255)->nullable()->comment('Versão com marca d\'água (só tipo=foto)');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('tamanho_bytes')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('capturado_em_dispositivo')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'execucao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_evidencias');
    }
};
