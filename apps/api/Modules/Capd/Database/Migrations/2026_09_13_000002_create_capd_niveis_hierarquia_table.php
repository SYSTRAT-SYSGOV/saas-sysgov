<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_niveis_hierarquia', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('nivel'); // 0 = mais próximo do servidor, cresce subindo
            $table->string('nome', 100);
            $table->string('cargo_referencia', 120)->nullable(); // metadado informativo, não usado na resolução
            $table->string('regra_substituicao', 30)->default('superior_hierarquico'); // substituto_legal | superior_hierarquico
            $table->boolean('is_topo')->default(false);
            $table->foreignId('avaliador_topo_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('avaliador_topo_role', 60)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'nivel']);
            $table->index(['tenant_id', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_niveis_hierarquia');
    }
};
