<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meio_ambiente_empreendimentos', function (Blueprint $table): void {
            $table->boolean('impacto_significativo')->default(false)->after('porte');
            $table->unsignedBigInteger('valor_empreendimento_centavos')->nullable()->after('impacto_significativo');
        });
    }

    public function down(): void
    {
        Schema::table('meio_ambiente_empreendimentos', function (Blueprint $table): void {
            $table->dropColumn(['impacto_significativo', 'valor_empreendimento_centavos']);
        });
    }
};
