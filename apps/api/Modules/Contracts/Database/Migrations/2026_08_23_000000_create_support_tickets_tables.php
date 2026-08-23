<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ticket_number');
            $table->string('title');
            $table->enum('category', ['duvida', 'suporte_tecnico', 'integracao_siconfi', 'white_label', 'reclamacao', 'outro'])->default('suporte_tecnico');
            $table->enum('priority', ['baixa', 'media', 'alta', 'critica'])->default('media');
            $table->enum('status', ['aberto', 'em_analise', 'aguardando_cliente', 'resolvido', 'fechado'])->default('aberto');
            $table->timestamp('sla_due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            // Índices compostos obrigatórios iniciando por tenant_id
            $table->unique(['tenant_id', 'ticket_number']);
            $table->index(['tenant_id', 'status', 'priority']);
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('ticket_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->boolean('is_internal_note')->default(false);
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_messages');
        Schema::dropIfExists('support_tickets');
    }
};
