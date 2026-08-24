<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('org_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('org_units')->cascadeOnDelete();
            
            $table->string('name', 255);
            $table->string('code', 50); // ex: SEC-01, GAB-00, DEP-04
            $table->string('acronym', 30)->nullable(); // ex: SEMAS, SMED, SMS, SMA
            $table->string('type', 40)->default('secretaria'); // raiz, secretaria, departamento, divisao, setor, autarquia, fundacao
            
            $table->unsignedInteger('level')->default(1); // 1 = raiz, 2 = secretaria, 3 = depto, etc.
            $table->string('path', 500)->default('1'); // Materialized Path: 1, 1.2, 1.2.5
            $table->unsignedInteger('order')->default(0); // Ordenação entre irmãos
            
            $table->boolean('is_active')->default(true);
            $table->text('inactivation_reason')->nullable();
            $table->json('metadata')->nullable(); // gestor_name, email, phone, address, etc.
            
            $table->timestamps();
            $table->softDeletes();

            // Índices de performance para busca em árvore e multi-tenant
            $table->index(['tenant_id', 'parent_id']);
            $table->index(['tenant_id', 'path']);
            $table->index(['tenant_id', 'level']);
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'order']);

            // RN-ORG-005: Unicidade de código por tenant e nome único entre irmãos
            $table->unique(['tenant_id', 'code']);
            $table->unique(['tenant_id', 'parent_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_units');
    }
};
