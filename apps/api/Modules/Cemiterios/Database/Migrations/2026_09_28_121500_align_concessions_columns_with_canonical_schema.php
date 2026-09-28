<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('concessions')) {
            return;
        }

        // 1. Renomeia modalidade -> tipo se necessário
        if (Schema::hasColumn('concessions', 'modalidade') && !Schema::hasColumn('concessions', 'tipo')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('modalidade', 'tipo');
            });
        } elseif (!Schema::hasColumn('concessions', 'tipo')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->string('tipo', 12)->default('perpetua')->after('holder_id');
            });
        }

        // 2. Renomeia inicio -> data_inicio se necessário
        if (Schema::hasColumn('concessions', 'inicio') && !Schema::hasColumn('concessions', 'data_inicio')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('inicio', 'data_inicio');
            });
        } elseif (!Schema::hasColumn('concessions', 'data_inicio')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->date('data_inicio')->nullable()->after('tipo');
            });
        }

        // 3. Renomeia termino -> data_fim se necessário
        if (Schema::hasColumn('concessions', 'termino') && !Schema::hasColumn('concessions', 'data_fim')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('termino', 'data_fim');
            });
        } elseif (!Schema::hasColumn('concessions', 'data_fim')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->date('data_fim')->nullable()->after('data_inicio');
            });
        }

        // 4. Cria coluna 'estado' e migra dados de 'situacao' se presente
        if (!Schema::hasColumn('concessions', 'estado')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->string('estado', 20)->default('Ativa')->after('data_fim');
            });

            if (Schema::hasColumn('concessions', 'situacao')) {
                DB::table('concessions')->where('situacao', 'vigente')->update(['estado' => 'Ativa']);
                DB::table('concessions')->where('situacao', 'expirada')->update(['estado' => 'Vencida']);
                DB::table('concessions')->where('situacao', 'extinta')->update(['estado' => 'Caduca']);
            }
        }

        // 5. Adiciona colunas complementares se inexistentes
        Schema::table('concessions', function (Blueprint $table): void {
            if (!Schema::hasColumn('concessions', 'base_legal')) {
                $table->string('base_legal', 40)->default('execucao_contrato')->after('estado');
            }
            if (!Schema::hasColumn('concessions', 'prazo_anos')) {
                $table->integer('prazo_anos')->nullable()->after('base_legal');
            }
            if (!Schema::hasColumn('concessions', 'taxa_manutencao_centavos')) {
                $table->integer('taxa_manutencao_centavos')->nullable()->after('prazo_anos');
            }
            if (!Schema::hasColumn('concessions', 'vigencia_manifestacao_dias')) {
                $table->integer('vigencia_manifestacao_dias')->nullable()->default(30)->after('taxa_manutencao_centavos');
            }
            if (!Schema::hasColumn('concessions', 'lock_version')) {
                $table->integer('lock_version')->default(0)->after('vigencia_manifestacao_dias');
            }
        });

        // 6. Atualiza índices
        try {
            Schema::table('concessions', function (Blueprint $table): void {
                if (Schema::hasColumn('concessions', 'situacao')) {
                    // Tenta remover índices antigos se existirem
                    try { $table->dropIndex(['tenant_id', 'situacao', 'termino']); } catch (\Throwable) {}
                    try { $table->dropIndex(['tenant_id', 'plot_id', 'situacao']); } catch (\Throwable) {}
                }
                try { $table->index(['tenant_id', 'estado', 'data_fim']); } catch (\Throwable) {}
                try { $table->index(['tenant_id', 'plot_id', 'estado']); } catch (\Throwable) {}
            });
        } catch (\Throwable) {}
    }

    public function down(): void
    {
        // Reversão segura
        if (!Schema::hasTable('concessions')) {
            return;
        }

        if (Schema::hasColumn('concessions', 'tipo') && !Schema::hasColumn('concessions', 'modalidade')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('tipo', 'modalidade');
            });
        }
        if (Schema::hasColumn('concessions', 'data_inicio') && !Schema::hasColumn('concessions', 'inicio')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('data_inicio', 'inicio');
            });
        }
        if (Schema::hasColumn('concessions', 'data_fim') && !Schema::hasColumn('concessions', 'termino')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->renameColumn('data_fim', 'termino');
            });
        }
    }
};
