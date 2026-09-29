<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemetery_operators', function (Blueprint $table): void {
            $table->foreignId('park_id')->nullable()->after('tenant_id')->constrained('cemetery_parks')->nullOnDelete();
            $table->date('aso_validade')->nullable()->after('observacoes');
            $table->date('epi_ultimo_registro')->nullable()->after('aso_validade');
            $table->string('cpf_cnpj', 255)->nullable()->change();

            $table->index(['tenant_id', 'park_id'], 'co_tenant_park_idx');
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_operators', function (Blueprint $table): void {
            $table->dropIndex('co_tenant_park_idx');
            $table->dropConstrainedForeignId('park_id');
            $table->dropColumn(['aso_validade', 'epi_ultimo_registro']);
            $table->string('cpf_cnpj', 20)->nullable()->change();
        });
    }
};
