<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RN-08 (art. 17, Lei 1.704/2006): Quinquênios persistidos e segregados
 * das notas de desempenho — 5% de gratificação por quinquênio de serviço efetivo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_quinquenios', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('servidor_id');
            // Data em que o quinquênio se completou (data_admissao + N*5 anos)
            $table->date('data_quinquenio');
            $table->decimal('percentual', 5, 2)->default(5.00);
            $table->timestamps();

            $table->unique(['tenant_id', 'servidor_id', 'data_quinquenio']);
            $table->index(['tenant_id', 'servidor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_quinquenios');
    }
};
