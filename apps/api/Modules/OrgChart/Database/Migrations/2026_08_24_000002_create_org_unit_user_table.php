<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('org_unit_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            
            $table->string('role', 30)->default('membro'); // responsavel, membro
            $table->boolean('is_primary')->default(false); // Unidade principal do usuário (RN-ORG-007)
            
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->json('metadata')->nullable(); // cargo, portaria_nomeacao, etc.
            
            $table->timestamps();

            // Índices de busca
            $table->index(['tenant_id', 'org_unit_id']);
            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'role']);
            $table->index(['tenant_id', 'is_primary']);

            // Unicidade de vínculo usuário ↔ unidade no tenant
            $table->unique(['tenant_id', 'org_unit_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_unit_user');
    }
};
