<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenant_module_org_unit', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->boolean('enabled')->default(true);
            $table->boolean('inherited')->default(false);
            $table->foreignId('set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'module_id', 'org_unit_id'], 'tmu_org_unit_unique');
            $table->index(['tenant_id', 'module_id', 'enabled'], 'tmu_org_unit_enabled_index');
            $table->index(['tenant_id', 'org_unit_id'], 'tmu_org_unit_tenant_org_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_module_org_unit');
    }
};
