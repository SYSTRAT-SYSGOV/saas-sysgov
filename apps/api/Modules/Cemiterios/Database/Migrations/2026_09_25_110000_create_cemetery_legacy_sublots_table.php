<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_legacy_sublots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->string('codigo_sublote', 10);
            $table->string('processo_administrativo', 30)->nullable();
            $table->date('validade_concessao')->nullable();
            $table->string('origem', 30)->default('TTT.DBF');
            $table->timestamps();

            $table->unique(['tenant_id', 'plot_id', 'codigo_sublote'], 'cls_tenant_plot_codigo_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_legacy_sublots');
    }
};
