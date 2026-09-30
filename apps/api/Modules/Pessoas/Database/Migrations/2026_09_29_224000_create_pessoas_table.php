<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('cpf');
            $table->string('cpf_hash', 64);
            $table->string('nome');
            $table->string('nome_social')->nullable();
            $table->date('data_nascimento')->nullable();
            $table->string('sexo', 20)->nullable();
            $table->string('nome_mae')->nullable();
            $table->string('nome_pai')->nullable();
            $table->string('estado_civil', 30)->nullable();
            $table->string('nacionalidade', 60)->nullable();
            $table->string('naturalidade', 100)->nullable();
            $table->string('nis', 20)->nullable();
            $table->string('status', 20)->default('ativo');
            $table->timestamps();

            $table->unique(['tenant_id', 'cpf_hash']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'nome']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas');
    }
};
