<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_processos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedInteger('numero');
            $table->unsignedSmallInteger('ano');
            $table->string('assunto', 500);
            $table->string('origem', 20); // externa, interna
            $table->foreignId('orgao_origem_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('orgao_atual_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('interessado_pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->foreignId('processo_pai_id')->nullable()->constrained('protocolo_processos')->nullOnDelete();
            $table->string('status', 32)->default('aberto');
            $table->unsignedBigInteger('ultimo_andamento_id')->nullable();
            $table->dateTime('data_abertura');
            $table->dateTime('data_conclusao')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['tenant_id', 'ano', 'numero']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'orgao_atual_id']);
            $table->index(['tenant_id', 'orgao_origem_id']);
            $table->index(['tenant_id', 'origem']);
            $table->index(['tenant_id', 'processo_pai_id']);
            $table->index(['tenant_id', 'interessado_pessoa_id']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_processos');
    }
};
