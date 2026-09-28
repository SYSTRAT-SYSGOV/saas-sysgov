<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índice para o relatório de capacitação por servidor (Fase de relatórios, tarefa 1.1):
 * a consulta filtra por tenant_id + status='concluida' + concluida_em num período. Medido com
 * 60 mil inscrições sintéticas: sem este índice, o filtro por período varria as inscrições
 * `concluida` do tenant inteiro (24 mil linhas) e filtrava concluida_em depois; com o índice, o
 * intervalo é resolvido direto (queda de ~44 ms para ~23 ms na consulta agregada). O índice
 * (tenant_id, turma_id, status) que já existia não ajuda aqui porque a consulta não passa por
 * turma_id. Não foi criado índice por data_inicio em cursos_turmas: a tabela de turmas continua
 * pequena o bastante para que a varredura completa seja mais barata que manter outro índice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_inscricoes', function (Blueprint $table): void {
            $table->index(['tenant_id', 'status', 'concluida_em'], 'cursos_inscricoes_tenant_id_status_concluida_em_index');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_inscricoes', function (Blueprint $table): void {
            $table->dropIndex('cursos_inscricoes_tenant_id_status_concluida_em_index');
        });
    }
};
