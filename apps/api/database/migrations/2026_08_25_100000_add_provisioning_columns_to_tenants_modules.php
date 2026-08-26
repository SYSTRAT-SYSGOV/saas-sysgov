<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Colunas de provisionamento/faturamento no tenant
        Schema::table('tenants', function (Blueprint $table): void {
            if (!Schema::hasColumn('tenants', 'domain')) {
                $table->string('domain')->nullable()->after('cnpj');
                $table->string('plan', 40)->default('professional')->after('status');
                $table->unsignedInteger('max_users')->default(50)->after('plan');
                $table->unsignedInteger('storage_limit_mb')->default(10240)->after('max_users');
                $table->unsignedBigInteger('monthly_fee_cents')->default(0)->after('storage_limit_mb');
                $table->unsignedBigInteger('setup_fee_cents')->default(0)->after('monthly_fee_cents');
                $table->boolean('custom_domain_enabled')->default(false)->after('setup_fee_cents');
                $table->unsignedBigInteger('custom_domain_fee_cents')->default(0)->after('custom_domain_enabled');
                $table->string('city')->nullable()->after('custom_domain_fee_cents');
                $table->string('uf', 2)->nullable()->after('city');
                $table->string('cnae')->nullable()->after('uf');
                $table->string('website')->nullable()->after('cnae');
                $table->string('contact_email')->nullable()->after('website');
            }
        });

        // Preço base por módulo (catálogo SaaS)
        Schema::table('modules', function (Blueprint $table): void {
            if (!Schema::hasColumn('modules', 'monthly_fee_cents')) {
                $table->unsignedBigInteger('monthly_fee_cents')->default(0)->after('enabled');
                $table->text('description')->nullable()->after('monthly_fee_cents');
            }
        });

        // Preço do módulo por tenant (0 = usa o preço base do catálogo)
        Schema::table('tenant_module', function (Blueprint $table): void {
            if (!Schema::hasColumn('tenant_module', 'monthly_fee_cents')) {
                $table->unsignedBigInteger('monthly_fee_cents')->default(0)->after('settings');
                $table->timestamp('trial_ends_at')->nullable()->after('monthly_fee_cents');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            foreach (['domain', 'plan', 'max_users', 'storage_limit_mb', 'monthly_fee_cents', 'setup_fee_cents', 'custom_domain_enabled', 'custom_domain_fee_cents', 'city', 'uf', 'cnae', 'website', 'contact_email'] as $col) {
                if (Schema::hasColumn('tenants', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
        Schema::table('modules', function (Blueprint $table): void {
            if (Schema::hasColumn('modules', 'monthly_fee_cents')) {
                $table->dropColumn('monthly_fee_cents');
            }
            if (Schema::hasColumn('modules', 'description')) {
                $table->dropColumn('description');
            }
        });
        Schema::table('tenant_module', function (Blueprint $table): void {
            if (Schema::hasColumn('tenant_module', 'monthly_fee_cents')) {
                $table->dropColumn('monthly_fee_cents');
            }
            if (Schema::hasColumn('tenant_module', 'trial_ends_at')) {
                $table->dropColumn('trial_ends_at');
            }
        });
    }
};
