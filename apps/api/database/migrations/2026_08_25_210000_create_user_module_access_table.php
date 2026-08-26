<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matriz de acesso: usuário × módulo × secretarias (org_units) × role no módulo
        Schema::create('user_module_access', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('module_alias', 60);
            $table->string('role', 40)->default('member'); // member | manager
            $table->json('org_unit_ids')->nullable();      // null = todas as secretarias; array = apenas as selecionadas (com descendentes)
            $table->boolean('can_manage_users')->default(false); // administrador do módulo (cria usuários só neste módulo)
            $table->timestamps();
            $table->unique(['user_id', 'tenant_id', 'module_alias']);
            $table->index(['tenant_id', 'module_alias']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_module_access');
    }
};
