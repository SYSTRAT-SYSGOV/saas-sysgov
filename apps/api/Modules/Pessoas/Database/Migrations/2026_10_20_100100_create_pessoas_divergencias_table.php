<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Divergências entre o dado civil de um módulo e o do cadastro central (unificar-cadastro-pessoas, D5).
 * Os valores são dado civil: ficam criptografados (cast no modelo) e a leitura é restrita por permissão.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_divergencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('modulo', 40);
            $table->string('tabela', 80);
            $table->unsignedBigInteger('registro_id');
            $table->string('campo', 40);
            $table->text('valor_modulo')->nullable();
            $table->text('valor_mdm')->nullable();
            $table->string('estado', 15)->default('aberta');
            $table->string('decisao', 10)->nullable();
            $table->foreignId('resolvida_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolvida_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'modulo', 'estado']);
            $table->index(['tenant_id', 'tabela', 'registro_id', 'campo'], 'pessoas_divergencias_registro_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_divergencias');
    }
};
