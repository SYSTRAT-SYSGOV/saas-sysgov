<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_modelos_certificado', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('titulo', 150);
            $table->text('corpo');
            $table->string('logotipo_path')->nullable();
            // até 3 assinaturas: [{nome, cargo, imagem_path}]
            $table->json('assinaturas')->nullable();
            $table->boolean('padrao')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'padrao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_modelos_certificado');
    }
};
