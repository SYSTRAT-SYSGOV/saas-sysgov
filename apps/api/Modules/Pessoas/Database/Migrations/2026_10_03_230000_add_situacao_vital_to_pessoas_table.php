<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->boolean('falecido')->default(false)->after('status');
            $table->date('data_falecimento')->nullable()->after('falecido');
            $table->string('certidao_obito_numero', 50)->nullable()->after('data_falecimento');
            $table->string('cartorio_obito', 150)->nullable()->after('certidao_obito_numero');
            $table->text('observacao_obito')->nullable()->after('cartorio_obito');

            $table->index(['tenant_id', 'falecido']);
        });
    }

    public function down(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'falecido']);
            $table->dropColumn([
                'falecido',
                'data_falecimento',
                'certidao_obito_numero',
                'cartorio_obito',
                'observacao_obito',
            ]);
        });
    }
};
