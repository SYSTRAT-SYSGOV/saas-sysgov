<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Services\DocumentoSucessaoService;
use Modules\Cemiterios\Support\PorTenant;

/** Diário — verifica integridade dos documentos de sucessão (hash SHA-256). */
final class VerificarIntegridadeDocumentosSucessao extends Command
{
    protected $signature = 'sucessao:verificar-integridade-documentos';

    protected $description = 'Verifica integridade dos documentos de sucessão comparando hashes SHA-256';

    public function handle(): int
    {
        $documentoService = app(DocumentoSucessaoService::class);
        $corrompidos = 0;

        PorTenant::executar(function ($tenant) use ($documentoService, &$corrompidos) {
            $documentos = SucessaoDocumento::where('tenant_id', $tenant->id)
                ->whereNull('deleted_at')
                ->chunkById(100, function ($docs) use ($documentoService, &$corrompidos, $tenant) {
                    foreach ($docs as $documento) {
                        if (!$documentoService->verificarHash($documento)) {
                            $corrompidos++;
                            // Publica evento de integridade comprometida
                            app(\App\Support\OutboxPublisher::class)->publish('SucessaoDocumentoIntegrityFailed', [
                                'documento_id' => $documento->id,
                                'sucessao_id' => $documento->sucessao_id,
                                'tenant_id' => $tenant->id,
                                'expected_hash' => $documento->hash,
                            ]);
                        }
                    }
                });
        });

        $this->info("Verificação concluída. Documentos corrompidos: {$corrompidos}");

        return self::SUCCESS;
    }
}