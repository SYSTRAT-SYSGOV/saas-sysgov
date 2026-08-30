<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Usuário: matrícula do servidor + cargo (posição na organização)
        Schema::table('users', function (Blueprint $t): void {
            if (!Schema::hasColumn('users', 'matricula')) {
                $t->string('matricula', 40)->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'cargo_id')) {
                $t->foreignId('cargo_id')->nullable()->after('matricula');
            }
        });

        // 2. Cargos (lista de posições dentro de uma secretaria/órgão do tenant)
        Schema::create('cargos', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('name', 120);
            $t->text('description')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index(['tenant_id', 'is_active']);
            $t->unique(['tenant_id', 'name']);
        });

        // 3. Categorias de grupos de acesso (ex.: "Técnicos", "Gestão", "Fiscalização")
        Schema::create('access_categories', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('name', 120);
            $t->text('description')->nullable();
            $t->timestamps();
            $t->index('tenant_id');
            $t->unique(['tenant_id', 'name']);
        });

        // 4. Grupos de acesso (pertencem a uma categoria; definem acessos herdados pelos usuários)
        Schema::create('access_groups', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->foreignId('category_id')->nullable()->constrained('access_categories')->nullOnDelete();
            $t->string('name', 120);
            $t->text('description')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index(['tenant_id', 'is_active']);
            $t->unique(['tenant_id', 'name']);
        });

        // 5. Vínculo usuário <-> grupo (herança de acesso)
        Schema::create('access_group_user', function (Blueprint $t): void {
            $t->foreignId('access_group_id')->constrained('access_groups')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->primary(['access_group_id', 'user_id']);
        });

        // 6. Matriz de acessos por grupo (mesma granularidade do user_module_access)
        Schema::create('access_group_access', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('access_group_id')->constrained('access_groups')->cascadeOnDelete();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('module_alias', 80);
            $t->string('role', 40)->default('viewer');
            $t->json('org_unit_ids')->nullable();
            $t->boolean('can_manage_users')->default(false);
            $t->boolean('can_create')->default(false);
            $t->boolean('can_edit')->default(false);
            $t->boolean('can_delete')->default(false);
            $t->timestamp('valid_to')->nullable();
            $t->timestamps();
            $t->unique(['access_group_id', 'module_alias'], 'aga_group_module_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_group_access');
        Schema::dropIfExists('access_group_user');
        Schema::dropIfExists('access_groups');
        Schema::dropIfExists('access_categories');
        Schema::dropIfExists('cargos');
        Schema::table('users', function (Blueprint $t): void {
            $t->dropForeign(['cargo_id']);
            $t->dropColumn(['cargo_id', 'matricula']);
        });
    }
};