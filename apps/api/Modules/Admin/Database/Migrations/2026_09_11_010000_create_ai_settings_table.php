<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Configuração de IA da plataforma — registro ÚNICO (singleton, sempre
     * id=1, ver Modules\Admin\Models\AiSettings::current()), gerenciado
     * apenas pelo Admin SYSTRAT e usado por TODOS os tenants (não é uma
     * configuração por tenant, ao contrário de tenants.settings).
     */
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->string('provider', 40)->default('nanogpt');
            $table->string('base_url', 255)->default('https://nano-gpt.com/api/v1');
            // Criptografada em repouso (cast 'encrypted' no Model) — nunca
            // retornada em texto puro pela API (ver AiSettingsController).
            $table->text('api_key')->nullable();
            $table->string('model', 120)->default('deepseek/deepseek-v4-pro-0813');
            $table->unsignedSmallInteger('max_tokens')->default(2048);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
