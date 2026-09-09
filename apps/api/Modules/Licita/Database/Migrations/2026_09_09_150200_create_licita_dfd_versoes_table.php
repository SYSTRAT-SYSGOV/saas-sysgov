<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_dfd_versoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dfd_id')->constrained('licita_dfds')->cascadeOnDelete();
            $table->smallInteger('versao');
            $table->string('acao');
            $table->json('campos_alterados')->nullable();
            $table->json('dados')->nullable();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['dfd_id', 'versao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_dfd_versoes');
    }
};
