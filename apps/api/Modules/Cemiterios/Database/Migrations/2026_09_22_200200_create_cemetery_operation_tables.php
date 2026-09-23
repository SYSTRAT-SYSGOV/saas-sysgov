<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deceased_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome');
            $table->string('nome_normalizado');
            $table->date('nascimento')->nullable();
            $table->date('falecimento');
            $table->unsignedSmallInteger('idade_obito')->nullable();
            $table->string('certidao_numero', 60)->nullable();
            $table->string('certidao_cartorio')->nullable();
            $table->string('certidao_arquivo')->nullable();
            $table->text('causa_morte')->nullable();   // cifrado (RN-06)
            $table->text('docs_medicos')->nullable();  // cifrado (RN-06)
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'certidao_numero']);
            $table->index(['tenant_id', 'nome_normalizado']);
        });

        if (DB::getDriverName() === 'mysql') {
            // Busca aproximada tolerante a erros de digitação (RF-25, D14).
            DB::statement('ALTER TABLE deceased_records ADD FULLTEXT INDEX deceased_nome_ft (nome_normalizado) WITH PARSER ngram');
        }

        Schema::create('cemetery_service_orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('numero');
            $table->string('tipo', 20);
            $table->foreignId('plot_id')->nullable()->constrained('plot_inventory')->nullOnDelete();
            $table->dateTime('agendada_para')->nullable();
            $table->string('equipe')->nullable();
            $table->string('situacao', 20)->default('emitida');
            $table->text('observacao')->nullable();
            $table->foreignId('executada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('executada_em')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'ano', 'numero']);
            $table->index(['tenant_id', 'situacao']);
        });

        Schema::create('cemetery_burials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('deceased_id')->constrained('deceased_records')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->string('tipo', 20)->nullable();
            $table->dateTime('sepultado_em');
            $table->string('situacao', 20)->default('confirmada'); // confirmada | cancelada | removida
            $table->string('origem', 20)->default('regular');      // regular | historico
            $table->string('livro_referencia')->nullable();
            $table->boolean('revisao_pendente')->default(false);
            $table->date('carencia_desde');
            $table->foreignId('service_order_id')->nullable()->constrained('cemetery_service_orders')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'plot_id', 'situacao']);
            $table->index(['tenant_id', 'revisao_pendente']);
        });

        Schema::create('cemetery_exhumations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('burial_id')->constrained('cemetery_burials')->cascadeOnDelete();
            $table->string('tipo', 20); // ordinaria | judicial | administrativa
            $table->unsignedTinyInteger('prazo_aplicado_anos')->nullable();
            $table->date('liberada_em')->nullable();
            $table->string('situacao', 20)->default('deferida');
            $table->string('motivo_suspensao')->nullable();
            $table->string('destino')->nullable();
            $table->foreignId('service_order_id')->nullable()->constrained('cemetery_service_orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'situacao']);
        });

        Schema::create('cemetery_judicial_exceptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('exhumation_id')->constrained('cemetery_exhumations')->cascadeOnDelete();
            $table->string('processo', 60);
            $table->string('juizo');
            $table->date('data_decisao');
            $table->string('arquivo');
            $table->date('prazo_contornado_ate');
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('cemetery_transfers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('burial_id')->constrained('cemetery_burials')->cascadeOnDelete();
            $table->foreignId('plot_origem_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->foreignId('plot_destino_id')->nullable()->constrained('plot_inventory')->nullOnDelete();
            $table->string('destino_externo')->nullable();
            $table->string('documento_destino')->nullable();
            $table->foreignId('exhumation_id')->nullable()->constrained('cemetery_exhumations')->nullOnDelete();
            $table->string('situacao', 20)->default('deferida');
            $table->foreignId('service_order_id')->nullable()->constrained('cemetery_service_orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_transfers');
        Schema::dropIfExists('cemetery_judicial_exceptions');
        Schema::dropIfExists('cemetery_exhumations');
        Schema::dropIfExists('cemetery_burials');
        Schema::dropIfExists('cemetery_service_orders');
        Schema::dropIfExists('deceased_records');
    }
};
