<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marca roles-template como pertencentes a um módulo específico (ex.:
 * 'capd'), para permitir cloná-las automaticamente para um tenant quando
 * aquele módulo é habilitado. Roles sem módulo (admin_tenant, gestor,
 * fiscal etc.) continuam disponíveis independentemente de módulo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('module', 50)->nullable()->after('scope');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn('module');
        });
    }
};
