<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Senha padrão do sistema por tenant (só admin altera). Usada no cadastro de usuários.
        Schema::create('tenant_security_settings', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('default_password_hash')->nullable();
            $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('default_password_set_at')->nullable();
            $t->timestamps();
            $t->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_security_settings');
    }
};