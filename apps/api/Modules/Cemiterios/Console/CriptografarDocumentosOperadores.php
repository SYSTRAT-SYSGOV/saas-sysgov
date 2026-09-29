<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Support\Documento;
use Modules\Cemiterios\Support\PorTenant;

/**
 * Migração de dados idempotente: criptografa o `cpf_cnpj` em texto puro de
 * `cemetery_operators` (via Crypt, mesmo mecanismo do cast `encrypted`) e
 * recalcula `documento_hash`; para operadores com `alvara_numero`/
 * `alvara_validade` preenchidos e sem nenhum credenciamento ainda registrado,
 * cria o primeiro `OperadorLicenca` para preservar o dado atual.
 */
final class CriptografarDocumentosOperadores extends Command
{
    protected $signature = 'cemiterio:criptografar-documentos-operadores {--tenant= : Slug do tenant específico (opcional)} {--dry-run : Simula sem persistir}';

    protected $description = 'Criptografa CPF/CNPJ de coveiros e pedreiros e migra o alvará vigente para o histórico de credenciamento (idempotente)';

    public function handle(): int
    {
        $tenantSlug = $this->option('tenant');
        $dryRun = (bool) $this->option('dry-run');
        $documentosCriptografados = 0;
        $licencasCriadas = 0;

        $rotina = function (\App\Models\Tenant $tenant) use ($dryRun, &$documentosCriptografados, &$licencasCriadas): void {
            DB::transaction(function () use ($dryRun, &$documentosCriptografados, &$licencasCriadas): void {
                OperadorCemiterio::query()->whereNotNull('cpf_cnpj')->chunkById(100, function ($operadores) use ($dryRun, &$documentosCriptografados): void {
                    foreach ($operadores as $operador) {
                        $valorAtual = (string) DB::table('cemetery_operators')->where('id', $operador->id)->value('cpf_cnpj');

                        if ($valorAtual === '') {
                            continue;
                        }

                        try {
                            Crypt::decryptString($valorAtual);
                            continue; // já criptografado
                        } catch (DecryptException) {
                            // texto puro — segue para criptografar
                        }

                        $limpo = Documento::somenteDigitos($valorAtual);
                        $hash = $limpo !== '' ? Documento::hash($limpo) : null;

                        if (!$dryRun) {
                            DB::table('cemetery_operators')->where('id', $operador->id)->update([
                                'cpf_cnpj' => Crypt::encryptString($valorAtual),
                                'documento_hash' => $hash,
                            ]);
                        }

                        $documentosCriptografados++;
                    }
                });

                OperadorCemiterio::query()
                    ->whereNotNull('alvara_numero')
                    ->whereNotNull('alvara_validade')
                    ->whereDoesntHave('licencas')
                    ->chunkById(100, function ($operadores) use ($dryRun, &$licencasCriadas): void {
                        foreach ($operadores as $operador) {
                            if (!$dryRun) {
                                $operador->licencas()->create([
                                    'tenant_id' => $operador->tenant_id,
                                    'numero' => $operador->alvara_numero,
                                    'validade' => $operador->alvara_validade,
                                ]);
                            }

                            $licencasCriadas++;
                        }
                    });
            });
        };

        if ($tenantSlug) {
            $tenant = \App\Models\Tenant::where('slug', $tenantSlug)->firstOrFail();
            app(\App\Support\TenantContext::class)->set($tenant);
            $rotina($tenant);
        } else {
            PorTenant::executar($rotina);
        }

        $this->info("Documentos criptografados: {$documentosCriptografados}. Credenciamentos criados a partir do alvará vigente: {$licencasCriadas}.");

        return self::SUCCESS;
    }
}
