<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alinha o schema do módulo Procurement com os models LicitacaoArtefato e LicitacaoContrato.
 *
 * A migration original criou 'procurement_artefatos' mas o model usa 'licitacao_artefatos'.
 * Também adiciona colunas que o model LicitacaoContrato espera e que não estavam na migration
 * original de contratos_licitacao.
 *
 * DECISÃO: rename + addColumn são aditivos no sentido de que não dropam dados existentes.
 * Usa Schema::hasTable/hasColumn como guarda.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Renomeia procurement_artefatos → licitacao_artefatos (alinhamento com o model)
        if (Schema::hasTable('procurement_artefatos') && !Schema::hasTable('licitacao_artefatos')) {
            Schema::rename('procurement_artefatos', 'licitacao_artefatos');
        }

        // 2. Adiciona coluna justificativa_reprovacao (presente no model, ausente na migration original)
        if (Schema::hasTable('licitacao_artefatos') && !Schema::hasColumn('licitacao_artefatos', 'justificativa_reprovacao')) {
            Schema::table('licitacao_artefatos', function (Blueprint $t): void {
                $t->text('justificativa_reprovacao')->nullable()->after('aprovado_em');
            });
        }

        // 3. Adiciona colunas ao contratos_licitacao que o model LicitacaoContrato espera
        if (Schema::hasTable('contratos_licitacao')) {
            if (!Schema::hasColumn('contratos_licitacao', 'objeto')) {
                Schema::table('contratos_licitacao', function (Blueprint $t): void {
                    $t->text('objeto')->nullable()->after('numero');
                });
            }
            if (!Schema::hasColumn('contratos_licitacao', 'fornecedor_nome')) {
                Schema::table('contratos_licitacao', function (Blueprint $t): void {
                    $t->string('fornecedor_nome', 255)->nullable()->after('licitacao_id');
                });
            }
            if (!Schema::hasColumn('contratos_licitacao', 'fornecedor_cnpj')) {
                Schema::table('contratos_licitacao', function (Blueprint $t): void {
                    $t->string('fornecedor_cnpj', 18)->nullable()->after('fornecedor_nome');
                });
            }
            if (!Schema::hasColumn('contratos_licitacao', 'valor_atualizado_cents')) {
                Schema::table('contratos_licitacao', function (Blueprint $t): void {
                    $t->unsignedBigInteger('valor_atualizado_cents')->nullable()->after('valor_inicial_cents');
                });
            }

            // fornecedor_id é NOT NULL na migration original mas o model usa fornecedor_nome/cnpj.
            // Torna nullable para alinhar com o model (Laravel 12 suporta change() nativo no SQLite).
            if (Schema::hasColumn('contratos_licitacao', 'fornecedor_id')) {
                Schema::table('contratos_licitacao', function (Blueprint $t): void {
                    $t->foreignId('fornecedor_id')->nullable()->change();
                });
            }
        }

        // 5. Renomeia tabelas para alinhar com os models antigos que os testes/serviços usam.
        //    As migrations criaram nomes 'aditivos_contratuais'/'medicoes_contratuais'/'pagamentos_contratuais'
        //    mas os models LicitacaoAditivo/Medicao/Pagamento usam 'licitacao_aditivos/medicoes/pagamentos'.
        $renameMap = [
            'aditivos_contratuais' => 'licitacao_aditivos',
            'medicoes_contratuais' => 'licitacao_medicoes',
            'pagamentos_contratuais' => 'licitacao_pagamentos',
        ];
        foreach ($renameMap as $from => $to) {
            if (Schema::hasTable($from) && !Schema::hasTable($to)) {
                Schema::rename($from, $to);
            }
        }

        // 6. Adiciona colunas ao licitacao_aditivos que o model LicitacaoAditivo espera
        //    (percentual_aditivo, nova_vigencia_fim, motivo — ausentes na migration original).
        if (Schema::hasTable('licitacao_aditivos')) {
            if (!Schema::hasColumn('licitacao_aditivos', 'percentual_aditivo')) {
                Schema::table('licitacao_aditivos', function (Blueprint $t): void {
                    $t->decimal('percentual_aditivo', 5, 2)->nullable()->after('valor_cents');
                });
            }
            if (!Schema::hasColumn('licitacao_aditivos', 'nova_vigencia_fim')) {
                Schema::table('licitacao_aditivos', function (Blueprint $t): void {
                    $t->date('nova_vigencia_fim')->nullable()->after('percentual_acumulado');
                });
            }
            if (!Schema::hasColumn('licitacao_aditivos', 'motivo')) {
                Schema::table('licitacao_aditivos', function (Blueprint $t): void {
                    $t->text('motivo')->nullable()->after('nova_vigencia_fim');
                });
            }
            if (!Schema::hasColumn('licitacao_aditivos', 'assinado_por')) {
                Schema::table('licitacao_aditivos', function (Blueprint $t): void {
                    $t->foreignId('assinado_por')->nullable()->constrained('users')->nullOnDelete();
                });
            }
            if (!Schema::hasColumn('licitacao_aditivos', 'assinado_em')) {
                Schema::table('licitacao_aditivos', function (Blueprint $t): void {
                    $t->dateTime('assinado_em')->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('licitacao_artefatos') && !Schema::hasTable('procurement_artefatos')) {
            Schema::rename('licitacao_artefatos', 'procurement_artefatos');
        }
    }
};