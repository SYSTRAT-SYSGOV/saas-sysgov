<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Biblioteca de assinaturas do órgão (D4), usada pelos modelos visuais. Sem soft delete: a
 * exclusão é recusada enquanto algum modelo referenciar a assinatura; o caminho de saída é
 * desativá-la.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_assinaturas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('cargo', 150)->nullable();
            $table->string('registro_profissional', 60)->nullable();
            $table->string('imagem_path')->nullable();
            $table->string('selo_path')->nullable();
            $table->boolean('ativa')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_assinaturas');
    }
};
