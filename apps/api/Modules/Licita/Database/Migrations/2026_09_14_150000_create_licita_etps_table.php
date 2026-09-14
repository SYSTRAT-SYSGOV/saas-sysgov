<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_etps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            // Texto único estruturado (art. 18, §1º da Lei 14.133/2021) — ao
            // contrário do DFD, o ETP não tem campos fixos por inciso: o
            // conteúdo é redigido corrido, com apoio de IA (RichTextEditorWithIa
            // genérico do módulo), igual à Justificativa do DFD.
            $table->longText('conteudo');
            // Equipe de planejamento própria do ETP — nasce como cópia da
            // equipe_planejamento do DFD do mesmo processo (EtpService::criar),
            // mas é editável independentemente dali em diante (não é uma
            // referência viva ao DFD).
            $table->json('equipe_planejamento')->nullable();
            $table->json('campos_extras')->nullable();
            $table->string('status')->default('rascunho');
            $table->boolean('gerado_por_ia')->default(false);
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo um ETP ativo — mesma observação do
            // DFD: garantido no EtpService::criar(), não por índice único
            // (MySQL não deduplica NULL em deleted_at).
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_etps');
    }
};
