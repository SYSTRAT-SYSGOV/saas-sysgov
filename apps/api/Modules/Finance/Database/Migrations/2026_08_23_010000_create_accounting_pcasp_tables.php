<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Plano de Contas Aplicado ao Setor Público (PCASP)
        Schema::create('chart_of_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('code', 30); // ex: 1.1.1.1.1.01.00
            $table->string('name');
            $table->enum('account_type', [
                'ativo', 'passivo', 'vpd', 'vpa', 
                'orcamentario_despesa', 'orcamentario_receita', 
                'controle_devedor', 'controle_credor'
            ]);
            $table->enum('nature', ['devedora', 'credora']);
            $table->unsignedTinyInteger('level')->default(1);
            $table->boolean('is_synthetic')->default(false); // sintética (grupo) ou analítica (recebe lançamentos)
            $table->foreignId('parent_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'account_type']);
        });

        // 2. Lançamentos Contábeis por Partidas Dobradas
        Schema::create('accounting_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('entry_number', 30);
            $table->date('entry_date');
            $table->string('description');
            $table->string('document_ref')->nullable(); // ex: Nota de Empenho nº 120/2026
            $table->unsignedBigInteger('total_amount_cents');
            $table->enum('status', ['rascunho', 'confirmado', 'estornado'])->default('confirmado');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'entry_number']);
            $table->index(['tenant_id', 'entry_date']);
        });

        // 3. Linhas do Lançamento Contábil (Débito / Crédito)
        Schema::create('accounting_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('entry_id')->constrained('accounting_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->cascadeOnDelete();
            $table->enum('type', ['debito', 'credito']);
            $table->unsignedBigInteger('amount_cents');
            $table->string('memo')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'entry_id']);
            $table->index(['tenant_id', 'account_id']);
        });

        // 4. Execução Orçamentária: Empenhos (Compromisso da Despesa)
        Schema::create('budget_commitments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('commitment_number', 30); // ex: 2026NE000123
            $table->date('commitment_date');
            $table->string('supplier_name');
            $table->string('supplier_cnpj', 18)->nullable();
            $table->string('expense_nature', 20); // ex: 3.3.90.39 (Outros Serviços de Terceiros - PJ)
            $table->string('function_code', 10)->default('04.122'); // ex: 04.122 (Administração Geral)
            $table->string('description');
            $table->unsignedBigInteger('amount_cents'); // valor empenhado
            $table->unsignedBigInteger('settled_amount_cents')->default(0); // liquidado
            $table->unsignedBigInteger('paid_amount_cents')->default(0); // pago
            $table->enum('status', ['empenhado', 'liquidado_parcial', 'liquidado', 'pago', 'anulado'])->default('empenhado');
            $table->timestamps();

            $table->unique(['tenant_id', 'commitment_number']);
            $table->index(['tenant_id', 'commitment_date']);
            $table->index(['tenant_id', 'status']);
        });

        // 5. Liquidações de Despesa
        Schema::create('budget_settlements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commitment_id')->constrained('budget_commitments')->cascadeOnDelete();
            $table->string('settlement_number', 30); // ex: 2026NL000085
            $table->date('settlement_date');
            $table->string('invoice_number')->nullable(); // Nota Fiscal
            $table->unsignedBigInteger('amount_cents');
            $table->string('status')->default('liquidado');
            $table->timestamps();

            $table->unique(['tenant_id', 'settlement_number']);
            $table->index(['tenant_id', 'commitment_id']);
        });

        // 6. Ordens de Pagamento
        Schema::create('budget_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('settlement_id')->constrained('budget_settlements')->cascadeOnDelete();
            $table->string('payment_number', 30); // ex: 2026OB000045
            $table->date('payment_date');
            $table->unsignedBigInteger('amount_cents');
            $table->string('bank_account')->nullable();
            $table->string('status')->default('pago');
            $table->timestamps();

            $table->unique(['tenant_id', 'payment_number']);
            $table->index(['tenant_id', 'settlement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_payments');
        Schema::dropIfExists('budget_settlements');
        Schema::dropIfExists('budget_commitments');
        Schema::dropIfExists('accounting_lines');
        Schema::dropIfExists('accounting_entries');
        Schema::dropIfExists('chart_of_accounts');
    }
};
