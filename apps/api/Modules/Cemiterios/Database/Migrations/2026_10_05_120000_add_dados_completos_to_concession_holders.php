<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->string('cep', 9)->nullable()->after('endereco');
            $table->string('logradouro', 255)->nullable()->after('cep');
            $table->string('numero', 20)->nullable()->after('logradouro');
            $table->string('complemento', 100)->nullable()->after('numero');
            $table->string('bairro', 100)->nullable()->after('complemento');
            $table->string('cidade', 100)->nullable()->after('bairro');
            $table->string('uf', 2)->nullable()->after('cidade');
            $table->json('contatos_adicionais')->nullable()->after('uf');
            $table->text('observacoes')->nullable()->after('contatos_adicionais');
        });
    }

    public function down(): void
    {
        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->dropColumn([
                'cep',
                'logradouro',
                'numero',
                'complemento',
                'bairro',
                'cidade',
                'uf',
                'contatos_adicionais',
                'observacoes',
            ]);
        });
    }
};
