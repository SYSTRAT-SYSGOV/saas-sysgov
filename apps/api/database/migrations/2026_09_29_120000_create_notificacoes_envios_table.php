<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notificacoes_envios', function (Blueprint $table): void {
            $table->id();
            // Nulo para eventos de plataforma sem tenant (ex.: recuperação de senha de um
            // usuário sem órgão) — mesmo padrão de outbox_events.tenant_id (design D1).
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('event_id')->constrained('outbox_events', 'event_id')->cascadeOnDelete();
            $table->string('tipo', 100);
            // Nulo quando o destinatário pretendido não tem e-mail cadastrado (situação
            // "ignorado", design D2) — o índice único não deduplica esse caso entre tentativas
            // (MySQL trata cada NULL como distinto), mas isso só duplica a linha de auditoria
            // do "ignorado", nunca um envio de verdade.
            $table->string('destinatario')->nullable();
            $table->enum('situacao', ['pendente', 'enviado', 'falhou', 'ignorado'])->default('pendente');
            $table->unsignedInteger('tentativas')->default(0);
            $table->text('erro')->nullable();
            $table->timestamp('enviado_em')->nullable();
            $table->timestamps();

            // Idempotência (design D2): o ouvinte reserva esta linha antes de enviar e só
            // envia de fato se a situação não for "enviado" — uma nova tentativa do mesmo
            // evento do Outbox nunca duplica o e-mail já enviado.
            $table->unique(['event_id', 'tipo', 'destinatario']);
            $table->index(['tenant_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacoes_envios');
    }
};
