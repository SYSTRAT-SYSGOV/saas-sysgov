<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('protocolo_processos', function (Blueprint $table): void {
            $table->text('descricao')->nullable()->after('assunto');
            $table->string('tipo_processo', 100)->default('administrativo_geral')->after('descricao');
            $table->boolean('sigiloso')->default(false)->after('tipo_processo');
            $table->string('arquivamento_tipo', 32)->nullable()->after('status'); // corrente, intermediario, permanente
            $table->dateTime('data_arquivamento')->nullable()->after('arquivamento_tipo');

            $table->index(['tenant_id', 'tipo_processo']);
            $table->index(['tenant_id', 'sigiloso']);
            $table->index(['tenant_id', 'arquivamento_tipo']);
        });
    }

    public function down(): void
    {
        Schema::table('protocolo_processos', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'tipo_processo']);
            $table->dropIndex(['tenant_id', 'sigiloso']);
            $table->dropIndex(['tenant_id', 'arquivamento_tipo']);

            $table->dropColumn([
                'descricao',
                'tipo_processo',
                'sigiloso',
                'arquivamento_tipo',
                'data_arquivamento',
            ]);
        });
    }
};
