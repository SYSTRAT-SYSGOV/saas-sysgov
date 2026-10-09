<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_empreendimentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('titular_pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->string('cnpj', 14)->nullable();
            $table->string('razao_social')->nullable();
            $table->string('atividade');
            $table->string('porte', 10);
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'atividade']);
            $table->unique(['tenant_id', 'cnpj']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_empreendimentos');
    }
};
