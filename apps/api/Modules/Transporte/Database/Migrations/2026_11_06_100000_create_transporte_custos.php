<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_custo_parametros', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->string('chave', 40);
            $table->decimal('valor', 16, 4);
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'ano', 'chave'], 'tr_custo_param_uq');
        });

        Schema::table('transporte_rotas', function (Blueprint $table): void {
            $table->json('caracteristicas')->nullable()->after('observacoes');
            $table->decimal('custo_contratado_mensal', 12, 2)->nullable()->after('caracteristicas');
        });
    }

    public function down(): void
    {
        Schema::table('transporte_rotas', function (Blueprint $table): void {
            $table->dropColumn(['caracteristicas', 'custo_contratado_mensal']);
        });
        Schema::dropIfExists('transporte_custo_parametros');
    }
};
