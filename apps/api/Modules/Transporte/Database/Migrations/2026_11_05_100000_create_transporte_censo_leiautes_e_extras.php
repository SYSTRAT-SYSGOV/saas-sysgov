<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_censo_leiautes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('base', 40);
            $table->unsignedSmallInteger('ano_censo');
            $table->string('delimitador', 1)->default('|');
            $table->string('codificacao', 20)->default('ISO-8859-1');
            $table->json('campos');
            $table->boolean('padrao')->default(false);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'tr_censo_leiautes_t_nome_uq');
        });

        Schema::create('transporte_censo_extras', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('entidade', 10);
            $table->unsignedBigInteger('entidade_id');
            $table->string('chave', 40);
            $table->text('valor');
            $table->boolean('sensivel')->default(false);
            $table->foreignId('importacao_id')->nullable()->constrained('transporte_importacoes')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'entidade', 'entidade_id', 'chave'], 'tr_censo_extras_uq');
        });

        Schema::table('transporte_importacoes', function (Blueprint $table): void {
            $table->foreignId('leiaute_id')->nullable()->after('tipo')->constrained('transporte_censo_leiautes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transporte_importacoes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('leiaute_id');
        });
        Schema::dropIfExists('transporte_censo_extras');
        Schema::dropIfExists('transporte_censo_leiautes');
    }
};
