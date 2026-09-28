<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('concessions', function (Blueprint $table): void {
            $table->string('processo_administrativo', 50)->nullable()->after('numero');
            $table->string('motivo_pendencia', 100)->nullable()->after('pendencia_regularizacao');
            $table->index(['tenant_id', 'processo_administrativo']);
        });

        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->boolean('titular_falecido')->default(false)->after('base_legal');
            $table->date('data_falecimento_titular')->nullable()->after('titular_falecido');
            $table->string('processo_inventario', 50)->nullable()->after('data_falecimento_titular');
            $table->index(['tenant_id', 'titular_falecido']);
        });

        Schema::table('cemetery_burials', function (Blueprint $table): void {
            $table->unsignedSmallInteger('gaveta_numero')->nullable()->after('tipo');
            $table->string('coveiro_nome', 150)->nullable()->after('livro_referencia');
            $table->string('pedreiro_nome', 150)->nullable()->after('coveiro_nome');
            $table->string('cartorio', 200)->nullable()->after('pedreiro_nome');
            $table->string('medico', 200)->nullable()->after('cartorio');
        });

        Schema::table('plot_inventory', function (Blueprint $table): void {
            $table->string('codigo_legado', 30)->nullable()->after('codigo');
            $table->string('processo_administrativo', 50)->nullable()->after('codigo_legado');
            $table->index(['tenant_id', 'codigo_legado']);
        });
    }

    public function down(): void
    {
        Schema::table('plot_inventory', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'codigo_legado']);
            $table->dropColumn(['codigo_legado', 'processo_administrativo']);
        });

        Schema::table('cemetery_burials', function (Blueprint $table): void {
            $table->dropColumn(['gaveta_numero', 'coveiro_nome', 'pedreiro_nome', 'cartorio', 'medico']);
        });

        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'titular_falecido']);
            $table->dropColumn(['titular_falecido', 'data_falecimento_titular', 'processo_inventario']);
        });

        Schema::table('concessions', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'processo_administrativo']);
            $table->dropColumn(['processo_administrativo', 'motivo_pendencia']);
        });
    }
};
